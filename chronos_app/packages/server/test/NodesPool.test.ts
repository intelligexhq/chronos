/**
 * Test suite for NodesPool provider filtering
 * Tests loadEnabledProviders resolution and allowlist behaviour
 */
import * as fs from 'fs'
import * as path from 'path'

export function nodesPoolTest() {
    describe('NodesPool - Provider Filtering', () => {
        let loadEnabledProviders: () => string[] | null

        const originalEnv = { ...process.env }

        beforeAll(() => {
            jest.resetModules()

            const mockLogger = {
                debug: jest.fn(),
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                http: jest.fn(),
                level: 'info'
            }
            jest.doMock('../src/utils/logger', () => ({
                __esModule: true,
                default: mockLogger,
                expressRequestLogger: jest.fn((req: any, res: any, next: any) => next())
            }))

            jest.doMock('../src/utils', () => ({
                getNodeModulesPackagePath: jest.fn(() => '/fake'),
                databaseEntities: {}
            }))

            jest.doMock('../src/AppConfig', () => ({
                appConfig: { showCommunityNodes: false }
            }))

            loadEnabledProviders = require('../src/NodesPool').loadEnabledProviders
        })

        afterAll(() => {
            jest.resetModules()
        })

        afterEach(() => {
            // Restore env vars after each test
            delete process.env.ENABLED_PROVIDERS
            delete process.env.PROVIDERS_CONFIG_LOCATION
            Object.assign(process.env, originalEnv)
        })

        describe('loadEnabledProviders', () => {
            it('should return null when no config exists and no env vars are set', () => {
                delete process.env.ENABLED_PROVIDERS
                process.env.PROVIDERS_CONFIG_LOCATION = '/nonexistent/path.json'

                const result = loadEnabledProviders()

                expect(result).toBeNull()
            })

            it('should parse ENABLED_PROVIDERS env var as comma-separated list', () => {
                process.env.ENABLED_PROVIDERS = 'chatOpenAI,chatAnthropic,chatOllama'

                const result = loadEnabledProviders()

                expect(result).toEqual(['chatOpenAI', 'chatAnthropic', 'chatOllama'])
            })

            it('should trim whitespace from ENABLED_PROVIDERS entries', () => {
                process.env.ENABLED_PROVIDERS = ' chatOpenAI , chatAnthropic , chatOllama '

                const result = loadEnabledProviders()

                expect(result).toEqual(['chatOpenAI', 'chatAnthropic', 'chatOllama'])
            })

            it('should filter out empty entries from ENABLED_PROVIDERS', () => {
                process.env.ENABLED_PROVIDERS = 'chatOpenAI,,chatAnthropic,'

                const result = loadEnabledProviders()

                expect(result).toEqual(['chatOpenAI', 'chatAnthropic'])
            })

            it('should prioritise ENABLED_PROVIDERS over config file', () => {
                process.env.ENABLED_PROVIDERS = 'chatOpenAI'
                // Even if a valid config file exists, env var takes precedence
                process.env.PROVIDERS_CONFIG_LOCATION = path.join(__dirname, '..', 'providers.config.json')

                const result = loadEnabledProviders()

                expect(result).toEqual(['chatOpenAI'])
            })

            it('should load from PROVIDERS_CONFIG_LOCATION when ENABLED_PROVIDERS is not set', () => {
                delete process.env.ENABLED_PROVIDERS
                const configPath = path.join(__dirname, '..', 'providers.config.json')
                process.env.PROVIDERS_CONFIG_LOCATION = configPath

                // Only run if the file exists (it should from our earlier creation)
                if (fs.existsSync(configPath)) {
                    const result = loadEnabledProviders()

                    expect(result).not.toBeNull()
                    expect(Array.isArray(result)).toBe(true)
                    expect(result!.length).toBeGreaterThan(0)
                    expect(result).toContain('chatOpenAI')
                    expect(result).toContain('chatAnthropic')
                }
            })

            it('should return null when config file has unrecognised mode', () => {
                delete process.env.ENABLED_PROVIDERS

                // Create a temporary config with bad mode
                const tmpConfig = path.join(__dirname, 'tmp-bad-mode.json')
                fs.writeFileSync(tmpConfig, JSON.stringify({ mode: 'denylist', providers: ['chatOpenAI'] }))
                process.env.PROVIDERS_CONFIG_LOCATION = tmpConfig

                try {
                    const result = loadEnabledProviders()
                    expect(result).toBeNull()
                } finally {
                    fs.unlinkSync(tmpConfig)
                }
            })

            it('should return null when config file has invalid JSON', () => {
                delete process.env.ENABLED_PROVIDERS

                const tmpConfig = path.join(__dirname, 'tmp-bad-json.json')
                fs.writeFileSync(tmpConfig, 'not valid json {{{')
                process.env.PROVIDERS_CONFIG_LOCATION = tmpConfig

                try {
                    const result = loadEnabledProviders()
                    expect(result).toBeNull()
                } finally {
                    fs.unlinkSync(tmpConfig)
                }
            })

            it('should return providers array from a valid allowlist config file', () => {
                delete process.env.ENABLED_PROVIDERS

                const tmpConfig = path.join(__dirname, 'tmp-valid.json')
                fs.writeFileSync(tmpConfig, JSON.stringify({ mode: 'allowlist', providers: ['chatOpenAI', 'chatOllama'] }))
                process.env.PROVIDERS_CONFIG_LOCATION = tmpConfig

                try {
                    const result = loadEnabledProviders()
                    expect(result).toEqual(['chatOpenAI', 'chatOllama'])
                } finally {
                    fs.unlinkSync(tmpConfig)
                }
            })

            it('should handle single provider in ENABLED_PROVIDERS', () => {
                process.env.ENABLED_PROVIDERS = 'chatOllama'

                const result = loadEnabledProviders()

                expect(result).toEqual(['chatOllama'])
            })
        })
    })
}
