/**
 * Unit tests for the OAuth2 refresh background scheduler
 * (`schedulers/OAuth2RefreshScheduler.ts`).
 *
 * Covers: start/stop, no-double-start guard, no-overlap guard, env-var
 * driven poll interval + lead window, candidate filter (only the
 * `oauth2-refresh` credentialName), per-credential staleness via decrypted
 * `expiresAt`, batched concurrency cap on the refresh phase, decrypt-peek
 * failure on one credential does not block the rest, refresh failure does
 * not throw out of the poll loop.
 */
export function oauth2RefreshSchedulerTest() {
    describe('OAuth2RefreshScheduler', () => {
        let OAuth2RefreshScheduler: any
        let ensureFreshAccessTokenMock: jest.Mock
        let decryptCredentialDataMock: jest.Mock
        let mockDataSource: any
        let mockCredentialRepo: any

        const setupMocks = () => {
            jest.doMock('../../src/services/credentials/oauth2-refresh', () => ({
                ensureFreshAccessToken: ensureFreshAccessTokenMock
            }))
            jest.doMock('../../src/utils', () => ({
                ...jest.requireActual('../../src/utils'),
                decryptCredentialData: decryptCredentialDataMock
            }))
        }

        const stagedCredential = (id: string, payload: Record<string, unknown>) => ({
            id,
            name: 'oauth-' + id,
            credentialName: 'oauth2-refresh',
            encryptedData: JSON.stringify(payload)
        })

        beforeEach(() => {
            jest.resetModules()
            delete process.env.MCP_OAUTH2_REFRESH_INTERVAL_MS
            delete process.env.MCP_OAUTH2_REFRESH_LEAD_MS

            ensureFreshAccessTokenMock = jest.fn().mockResolvedValue('atok-new')
            decryptCredentialDataMock = jest.fn(async (encrypted: string) => JSON.parse(encrypted))

            mockCredentialRepo = {
                find: jest.fn().mockResolvedValue([])
            }
            mockDataSource = {
                getRepository: jest.fn().mockReturnValue(mockCredentialRepo)
            }

            setupMocks()
            OAuth2RefreshScheduler = require('../../src/schedulers/OAuth2RefreshScheduler').OAuth2RefreshScheduler
        })

        afterEach(() => {
            jest.dontMock('../../src/services/credentials/oauth2-refresh')
            jest.dontMock('../../src/utils')
        })

        const createScheduler = () => new OAuth2RefreshScheduler({ appDataSource: mockDataSource })

        // ─── start/stop ────────────────────────────────────────────────

        describe('start/stop', () => {
            it('starts and stops without errors', () => {
                const scheduler = createScheduler()
                scheduler.start()
                expect((scheduler as any).intervalId).not.toBeNull()
                scheduler.stop()
                expect((scheduler as any).intervalId).toBeNull()
            })

            it('does not start twice', () => {
                const scheduler = createScheduler()
                scheduler.start()
                const first = (scheduler as any).intervalId
                scheduler.start()
                expect((scheduler as any).intervalId).toBe(first)
                scheduler.stop()
            })
        })

        // ─── poll filter ───────────────────────────────────────────────

        describe('candidate selection', () => {
            it('queries only credentials with credentialName=oauth2-refresh', async () => {
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(mockCredentialRepo.find).toHaveBeenCalledWith({
                    where: { credentialName: 'oauth2-refresh' }
                })
            })

            it('does not overlap polls', async () => {
                const scheduler = createScheduler()
                ;(scheduler as any).running = true
                await (scheduler as any).poll()
                expect(mockCredentialRepo.find).not.toHaveBeenCalled()
            })

            it('resets running flag even when find() throws', async () => {
                mockCredentialRepo.find.mockRejectedValueOnce(new Error('db down'))
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect((scheduler as any).running).toBe(false)
            })
        })

        // ─── staleness ─────────────────────────────────────────────────

        describe('staleness check', () => {
            it('refreshes credentials whose expiresAt is within the default 5-minute lead window', async () => {
                mockCredentialRepo.find.mockResolvedValue([
                    stagedCredential('cred-stale', {
                        type: 'oauth2-refresh',
                        expiresAt: new Date(Date.now() + 60_000).toISOString()
                    })
                ])
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(ensureFreshAccessTokenMock).toHaveBeenCalledTimes(1)
                expect(ensureFreshAccessTokenMock).toHaveBeenCalledWith({ credentialId: 'cred-stale' })
            })

            it('skips credentials whose expiresAt is outside the lead window', async () => {
                mockCredentialRepo.find.mockResolvedValue([
                    stagedCredential('cred-fresh', {
                        type: 'oauth2-refresh',
                        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString()
                    })
                ])
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(ensureFreshAccessTokenMock).not.toHaveBeenCalled()
            })

            it('honours MCP_OAUTH2_REFRESH_LEAD_MS env override', async () => {
                process.env.MCP_OAUTH2_REFRESH_LEAD_MS = '600000' // 10 min
                mockCredentialRepo.find.mockResolvedValue([
                    stagedCredential('cred-7min', {
                        type: 'oauth2-refresh',
                        // 7 min away — outside default 5min, inside 10min override
                        expiresAt: new Date(Date.now() + 7 * 60_000).toISOString()
                    })
                ])
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(ensureFreshAccessTokenMock).toHaveBeenCalledWith({ credentialId: 'cred-7min' })
            })

            it('skips credentials with unparseable expiresAt', async () => {
                mockCredentialRepo.find.mockResolvedValue([
                    stagedCredential('cred-junk', { type: 'oauth2-refresh', expiresAt: 'not-a-date' })
                ])
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(ensureFreshAccessTokenMock).not.toHaveBeenCalled()
            })

            it('skips credentials with no expiresAt field', async () => {
                mockCredentialRepo.find.mockResolvedValue([stagedCredential('cred-noexpiry', { type: 'oauth2-refresh' })])
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(ensureFreshAccessTokenMock).not.toHaveBeenCalled()
            })
        })

        // ─── isolation ─────────────────────────────────────────────────

        describe('failure isolation', () => {
            it('continues iterating when one credential fails to decrypt', async () => {
                decryptCredentialDataMock
                    .mockImplementationOnce(() => {
                        throw new Error('decrypt boom')
                    })
                    .mockImplementationOnce(async (encrypted: string) => JSON.parse(encrypted))
                mockCredentialRepo.find.mockResolvedValue([
                    stagedCredential('cred-broken', { type: 'oauth2-refresh', expiresAt: new Date().toISOString() }),
                    stagedCredential('cred-stale', {
                        type: 'oauth2-refresh',
                        expiresAt: new Date(Date.now() + 60_000).toISOString()
                    })
                ])
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(ensureFreshAccessTokenMock).toHaveBeenCalledTimes(1)
                expect(ensureFreshAccessTokenMock).toHaveBeenCalledWith({ credentialId: 'cred-stale' })
            })

            it('does not throw out of the poll when ensureFreshAccessToken rejects', async () => {
                ensureFreshAccessTokenMock.mockRejectedValue(new Error('refresh boom'))
                mockCredentialRepo.find.mockResolvedValue([
                    stagedCredential('cred-stale', {
                        type: 'oauth2-refresh',
                        expiresAt: new Date(Date.now() + 60_000).toISOString()
                    })
                ])
                const scheduler = createScheduler()
                await expect((scheduler as any).poll()).resolves.toBeUndefined()
                expect((scheduler as any).running).toBe(false)
            })
        })

        // ─── concurrency ───────────────────────────────────────────────

        describe('concurrency cap', () => {
            it('processes more than 10 stale credentials by batching', async () => {
                const stale = Array.from({ length: 25 }, (_, i) =>
                    stagedCredential('cred-' + i, {
                        type: 'oauth2-refresh',
                        expiresAt: new Date(Date.now() + 60_000).toISOString()
                    })
                )
                mockCredentialRepo.find.mockResolvedValue(stale)
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(ensureFreshAccessTokenMock).toHaveBeenCalledTimes(25)
            })
        })

        // ─── env-driven interval ───────────────────────────────────────

        describe('poll interval env override', () => {
            it('logs the configured interval (smoke — just verifies start() does not throw)', () => {
                process.env.MCP_OAUTH2_REFRESH_INTERVAL_MS = '15000'
                const scheduler = createScheduler()
                scheduler.start()
                expect((scheduler as any).intervalId).not.toBeNull()
                scheduler.stop()
            })
        })
    })
}
