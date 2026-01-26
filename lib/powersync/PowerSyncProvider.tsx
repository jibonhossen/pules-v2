/**
 * PowerSync Provider Component
 * Wraps the app with PowerSync context and handles initialization
 */
import { useAuth } from '@clerk/clerk-expo';
import { PowerSyncContext } from '@powersync/react';
import NetInfo from '@react-native-community/netinfo';
import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { SupabaseConnector } from './connector';
import { db, initPowerSync } from './database';

interface PowerSyncProviderProps {
    children: ReactNode;
}

import { useSessionStore } from '@/store/sessions';

export function PowerSyncProvider({ children }: PowerSyncProviderProps) {
    const { getToken } = useAuth();
    const userId = useSessionStore((state) => state.userId);
    const [jwtTemplateFailed, setJwtTemplateFailed] = useState(false);

    // Create a stable getToken callback for the connector
    const getAuthToken = useCallback(async () => {
        // Skip if we already know the JWT template doesn't exist
        if (jwtTemplateFailed) {
            return null;
        }

        // Check network status first - fail fast if offline
        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected) {
            console.log('[PowerSync] Offline, skipping token fetch');
            return null;
        }

        try {
            // Get Clerk JWT token with timeout
            // If Clerk takes too long (e.g. slow network), we shouldn't block local DB forever
            const timeoutPromise = new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), 3000)
            );

            const tokenPromise = getToken({ template: 'supabase' });

            // Race against 3s timeout
            const token = await Promise.race([tokenPromise, timeoutPromise]);

            if (!token) {
                console.log('[PowerSync] Token fetch timed out or null');
            }
            return token;
        } catch (error: any) {
            // Check if this is a "template not found" error
            if (error?.message?.includes('No JWT template') ||
                error?.toString?.()?.includes('No JWT template')) {
                console.warn('[PowerSync] JWT template "supabase" not found in Clerk. Running in local-only mode. Create the template in Clerk Dashboard to enable cloud sync.');
                setJwtTemplateFailed(true);
            } else {
                console.error('[PowerSync] Failed to get auth token:', error);
            }
            return null;
        }
    }, [getToken, jwtTemplateFailed]);

    useEffect(() => {
        const setup = async () => {
            try {
                // Initialize the PowerSync database
                await initPowerSync();

                if (userId && !jwtTemplateFailed) {
                    // Connect with authentication
                    const connector = new SupabaseConnector(userId, getAuthToken);
                    await db.connect(connector);
                    console.log('[PowerSync] Connected with user:', userId);
                } else if (userId && jwtTemplateFailed) {
                    // User is logged in but no cloud sync available
                    console.log('[PowerSync] Running in local-only mode (JWT template not configured)');
                } else {
                    // Disconnect if user logs out
                    await db.disconnect();
                    console.log('[PowerSync] Disconnected - no user');
                }
            } catch (error) {
                console.error('[PowerSync] Setup failed:', error);
                // Still continue - PowerSync works in local-only mode
            }
        };

        setup();

        return () => {
            // Cleanup on unmount
            db.disconnect().catch(console.error);
        };
    }, [userId, getAuthToken, jwtTemplateFailed]);

    // Always render children - PowerSync works in local-only mode if not connected
    return (
        <PowerSyncContext.Provider value={db}>
            {children}
        </PowerSyncContext.Provider>
    );
}
