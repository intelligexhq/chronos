/**
 * Simplified Identity management.
 * Without SSO or other integrations
 */

import express from 'express'
import { Platform } from './Interface'

export class SimpleIdentityManager {
    private static instance: SimpleIdentityManager
    private currentPlatform: Platform = Platform.OPEN_SOURCE

    /**
     * Get singleton instance of SimpleIdentityManager
     */
    public static async getInstance(): Promise<SimpleIdentityManager> {
        if (!SimpleIdentityManager.instance) {
            SimpleIdentityManager.instance = new SimpleIdentityManager()
        }
        return SimpleIdentityManager.instance
    }

    /**
     * Get the current platform type
     */
    public getPlatformType(): Platform {
        return this.currentPlatform
    }

    /**
     * Check if running in open source mode
     */
    public isOpenSource(): boolean {
        return true
    }

    /**
     * Check if running in enterprise mode
     */
    public isEnterprise(): boolean {
        return false
    }

    /**
     * Check if running in cloud mode
     */
    public isCloud(): boolean {
        return false
    }

    /**
     * Check if license is valid (always true for open source)
     */
    public isLicenseValid(): boolean {
        return true
    }

    /**
     * Get features by plan (returns empty for open source)
     */
    public async getFeaturesByPlan(_subscriptionId?: string): Promise<Record<string, string>> {
        return {}
    }

    /**
     * Get product ID from subscription (returns empty for open source)
     */
    public async getProductIdFromSubscription(_subscriptionId?: string): Promise<string> {
        return ''
    }

    /**
     * Initialize SSO (no-op for open source)
     */
    public async initializeSSO(_app: express.Application): Promise<void> {
        // No-op for open source - SSO is an enterprise feature
    }
}
