import { Telemetry, TelemetryEventType } from '../../src/utils/telemetry'

/**
 * Test suite for telemetry utility
 * Tests telemetry event sending
 */
export function telemetryUtilTest() {
    describe('Telemetry Utilities', () => {
        describe('TelemetryEventType', () => {
            it('should have USER_CREATED event type', () => {
                expect(TelemetryEventType.USER_CREATED).toBe('user_created')
            })

            it('should have ORGANIZATION_CREATED event type', () => {
                expect(TelemetryEventType.ORGANIZATION_CREATED).toBe('organization_created')
            })
        })

        describe('Telemetry class', () => {
            let originalEnv: string | undefined

            beforeEach(() => {
                originalEnv = process.env.POSTHOG_PUBLIC_API_KEY
            })

            afterEach(() => {
                if (originalEnv) {
                    process.env.POSTHOG_PUBLIC_API_KEY = originalEnv
                } else {
                    delete process.env.POSTHOG_PUBLIC_API_KEY
                }
            })

            it('should create telemetry instance without PostHog when key not set', () => {
                delete process.env.POSTHOG_PUBLIC_API_KEY

                const telemetry = new Telemetry()

                expect(telemetry.postHog).toBeUndefined()
            })

            it('should handle sendTelemetry when PostHog is not initialized', async () => {
                delete process.env.POSTHOG_PUBLIC_API_KEY

                const telemetry = new Telemetry()

                // Should not throw
                await expect(telemetry.sendTelemetry('test_event', { key: 'value' })).resolves.not.toThrow()
            })

            it('should handle sendTelemetry with empty properties', async () => {
                delete process.env.POSTHOG_PUBLIC_API_KEY

                const telemetry = new Telemetry()

                await expect(telemetry.sendTelemetry('test_event', {})).resolves.not.toThrow()
            })

            it('should handle sendTelemetry with orgId when not initialized', async () => {
                delete process.env.POSTHOG_PUBLIC_API_KEY

                const telemetry = new Telemetry()

                await expect(telemetry.sendTelemetry('test_event', {}, 'org-123')).resolves.not.toThrow()
            })

            it('should handle sendTelemetry with complex properties', async () => {
                delete process.env.POSTHOG_PUBLIC_API_KEY

                const telemetry = new Telemetry()

                await expect(
                    telemetry.sendTelemetry('test_event', {
                        nested: { key: 'value' },
                        array: [1, 2, 3],
                        number: 42
                    })
                ).resolves.not.toThrow()
            })

            it('should handle flush when PostHog is not initialized', async () => {
                delete process.env.POSTHOG_PUBLIC_API_KEY

                const telemetry = new Telemetry()

                // Should not throw
                await expect(telemetry.flush()).resolves.not.toThrow()
            })

            it('should handle multiple sendTelemetry calls', async () => {
                delete process.env.POSTHOG_PUBLIC_API_KEY

                const telemetry = new Telemetry()

                await telemetry.sendTelemetry('event1', { key: 'value1' })
                await telemetry.sendTelemetry('event2', { key: 'value2' })
                await telemetry.sendTelemetry('event3', { key: 'value3' }, 'org-123')

                expect(true).toBe(true)
            })
        })
    })
}
