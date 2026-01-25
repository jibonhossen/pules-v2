import { getCloudStats, isSyncAvailable, syncAll, type SyncResult, type SyncStatus } from '@/lib/sync-engine';
import { useSessionStore } from '@/store/sessions';
import { create } from 'zustand';

interface SyncState {
    // Sync status
    status: SyncStatus;
    lastSyncTime: Date | null;
    pendingChanges: number;
    error: string | null;

    // Sync result
    lastResult: SyncResult | null;

    // Cloud stats
    cloudStats: {
        totalSessions: number;
        totalFocusTime: number;
        totalTopics: number;
        devices: number;
    } | null;

    // Auto-sync settings
    autoSyncEnabled: boolean;

    // Actions
    sync: (userId: string) => Promise<SyncResult>;
    loadCloudStats: (userId: string) => Promise<void>;
    setAutoSync: (enabled: boolean) => void;
    clearError: () => void;
    incrementPendingChanges: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
    // Initial state
    status: 'idle',
    lastSyncTime: null,
    pendingChanges: 0,
    error: null,
    lastResult: null,
    cloudStats: null,
    autoSyncEnabled: true,

    // Start sync
    sync: async (userId: string) => {
        // Check availability
        if (!isSyncAvailable(userId)) {
            // error handling
            const result: SyncResult = {
                success: false,
                sessionsUploaded: 0,
                sessionsDownloaded: 0,
                foldersUploaded: 0,
                foldersDownloaded: 0,
                error: 'Not signed in',
            };
            set({ error: 'Sign in to enable cloud sync' });
            return result;
        }

        set({ status: 'syncing', error: null });

        try {
            const result = await syncAll(userId);

            if (result.success) {
                set({
                    status: 'success',
                    lastSyncTime: new Date(),
                    lastResult: result,
                    pendingChanges: 0,
                    error: null,
                });

                // Reload sessions to update UI with potential downloads
                await useSessionStore.getState().loadSessions();
                await useSessionStore.getState().loadStats();
            } else {
                set({
                    status: 'error',
                    lastResult: result,
                    error: result.error || 'Sync failed',
                });
            }

            return result;
        } catch (error: any) {
            // error handling
            const result: SyncResult = {
                success: false,
                sessionsUploaded: 0,
                sessionsDownloaded: 0,
                foldersUploaded: 0,
                foldersDownloaded: 0,
                error: error.message || 'Sync failed',
            };

            set({
                status: 'error',
                lastResult: result,
                error: error.message || 'Sync failed',
            });

            return result;
        }
    },

    // Load cloud stats
    loadCloudStats: async (userId: string) => {
        if (!isSyncAvailable(userId)) return;

        try {
            const stats = await getCloudStats(userId);
            set({ cloudStats: stats });
        } catch (error) {
            console.error('Failed to load cloud stats:', error);
        }
    },

    // Toggle auto-sync
    setAutoSync: (enabled: boolean) => {
        set({ autoSyncEnabled: enabled });
    },

    // Clear error
    clearError: () => {
        set({ error: null });
    },

    // Increment pending changes (called when local data changes)
    incrementPendingChanges: () => {
        set(state => ({ pendingChanges: state.pendingChanges + 1 }));
    },
}));

// Auto-sync after session ends (can be called from session store)
export async function triggerAutoSync(userId: string | null | undefined): Promise<void> {
    if (!userId) return;

    const { autoSyncEnabled, sync } = useSyncStore.getState();

    if (autoSyncEnabled) {
        // Debounce: wait a bit before syncing
        setTimeout(async () => {
            await sync(userId);
        }, 2000);
    } else {
        useSyncStore.getState().incrementPendingChanges();
    }
}
