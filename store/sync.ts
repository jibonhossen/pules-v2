/**
 * Sync Store - PowerSync Status
 * Simplified store that uses PowerSync's built-in sync status
 */
import { db } from '@/lib/powersync/database';
import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

interface SyncState {
    status: SyncStatus;
    lastSyncTime: Date | null;
    error: string | null;
    isConnected: boolean;

    // Actions
    updateStatus: () => void;
    clearError: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
    status: 'idle',
    lastSyncTime: null,
    error: null,
    isConnected: false,

    updateStatus: () => {
        const psStatus = db.currentStatus;

        let status: SyncStatus = 'idle';
        if (!psStatus) {
            status = 'offline';
        } else if (psStatus.dataFlowStatus?.uploading || psStatus.dataFlowStatus?.downloading) {
            status = 'syncing';
        } else if (psStatus.connected) {
            status = 'success';
        } else {
            status = 'offline';
        }

        set({
            status,
            isConnected: psStatus?.connected || false,
            lastSyncTime: psStatus?.lastSyncedAt ? new Date(psStatus.lastSyncedAt) : null,
        });
    },

    clearError: () => {
        set({ error: null });
    },
}));

// Auto-update status when PowerSync status changes
db.registerListener({
    statusChanged: (status) => {
        useSyncStore.getState().updateStatus();
    },
});
