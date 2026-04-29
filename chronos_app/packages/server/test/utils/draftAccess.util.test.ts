import { StatusCodes } from 'http-status-codes'

/**
 * Unit tests for the draft-access helper.
 *
 * The header parser is exercised directly. The auth gate uses doMock to
 * stub validateAPIKey so we can simulate the external-API-key path without
 * spinning up a real database.
 */
export function draftAccessUtilTest() {
    describe('draftAccess utility', () => {
        let isDraftRequested: any
        let assertDraftAccess: any
        let validateAPIKeyMock: jest.Mock

        beforeAll(() => {
            jest.resetModules()
            validateAPIKeyMock = jest.fn()
            jest.doMock('../../src/utils/validateKey', () => ({
                validateAPIKey: validateAPIKeyMock,
                validateFlowAPIKey: jest.fn()
            }))
            const mod = require('../../src/utils/draftAccess')
            isDraftRequested = mod.isDraftRequested
            assertDraftAccess = mod.assertDraftAccess
        })

        afterAll(() => {
            jest.resetModules()
        })

        beforeEach(() => {
            validateAPIKeyMock.mockReset()
        })

        describe('isDraftRequested', () => {
            it('returns true for "true" (lowercase)', () => {
                expect(isDraftRequested({ headers: { 'x-chronos-draft': 'true' } } as any)).toBe(true)
            })
            it('is case-insensitive', () => {
                expect(isDraftRequested({ headers: { 'x-chronos-draft': 'TRUE' } } as any)).toBe(true)
                expect(isDraftRequested({ headers: { 'x-chronos-draft': 'True' } } as any)).toBe(true)
            })
            it('returns false for missing header', () => {
                expect(isDraftRequested({ headers: {} } as any)).toBe(false)
            })
            it('treats other values strictly as false', () => {
                expect(isDraftRequested({ headers: { 'x-chronos-draft': '1' } } as any)).toBe(false)
                expect(isDraftRequested({ headers: { 'x-chronos-draft': 'yes' } } as any)).toBe(false)
                expect(isDraftRequested({ headers: { 'x-chronos-draft': 'false' } } as any)).toBe(false)
            })
            it('handles array-shaped headers (express may parse repeats this way)', () => {
                expect(isDraftRequested({ headers: { 'x-chronos-draft': ['true'] } } as any)).toBe(true)
            })
        })

        describe('assertDraftAccess (internal)', () => {
            it('allows owner', async () => {
                await expect(
                    assertDraftAccess({ userId: 'u1', userRole: 'user', headers: {} } as any, { id: 'flow', userId: 'u1' } as any, true)
                ).resolves.toBeUndefined()
            })
            it('allows admin even for non-owned flows', async () => {
                await expect(
                    assertDraftAccess({ userId: 'u2', userRole: 'admin', headers: {} } as any, { id: 'flow', userId: 'u1' } as any, true)
                ).resolves.toBeUndefined()
            })
            it('forbids non-owner non-admin', async () => {
                await expect(
                    assertDraftAccess({ userId: 'u3', userRole: 'user', headers: {} } as any, { id: 'flow', userId: 'u1' } as any, true)
                ).rejects.toMatchObject({ statusCode: StatusCodes.FORBIDDEN })
            })
            it('forbids when no userId attached', async () => {
                await expect(assertDraftAccess({ headers: {} } as any, { id: 'flow', userId: 'u1' } as any, true)).rejects.toMatchObject({
                    statusCode: StatusCodes.FORBIDDEN
                })
            })
        })

        describe('assertDraftAccess (external)', () => {
            it('allows when validateAPIKey says valid', async () => {
                validateAPIKeyMock.mockResolvedValue({ isValid: true })
                await expect(assertDraftAccess({ headers: {} } as any, { id: 'flow', userId: 'u1' } as any, false)).resolves.toBeUndefined()
            })
            it('rejects when no valid API key', async () => {
                validateAPIKeyMock.mockResolvedValue({ isValid: false })
                await expect(assertDraftAccess({ headers: {} } as any, { id: 'flow', userId: 'u1' } as any, false)).rejects.toMatchObject({
                    statusCode: StatusCodes.UNAUTHORIZED
                })
            })
        })
    })
}
