/**
 * PowerSync Backend Connector
 * Handles authentication and data uploads to Supabase
 */
import {
    AbstractPowerSyncDatabase,
    PowerSyncBackendConnector,
    UpdateType,
} from '@powersync/react-native';
import { supabase } from '../supabase';

// PowerSync Cloud URL - set this in your .env file
const POWERSYNC_URL = process.env.EXPO_PUBLIC_POWERSYNC_URL || '';

export class SupabaseConnector implements PowerSyncBackendConnector {
    private userId: string;
    private getToken: () => Promise<string | null>;

    constructor(userId: string, getToken: () => Promise<string | null>) {
        this.userId = userId;
        this.getToken = getToken;
    }

    /**
     * Fetch credentials for PowerSync connection
     * Called periodically to refresh the auth token
     */
    async fetchCredentials() {
        const token = await this.getToken();

        if (!token) {
            throw new Error('No authentication token available');
        }

        return {
            endpoint: POWERSYNC_URL,
            token: token,
        };
    }

    /**
     * Upload local changes to Supabase
     * PowerSync queues changes locally and calls this to sync them
     */
    async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
        const transaction = await database.getNextCrudTransaction();

        if (!transaction) {
            return;
        }

        try {
            for (const op of transaction.crud) {
                const table = op.table;
                const now = new Date().toISOString();

                switch (op.op) {
                    case UpdateType.PUT:
                        await this.handlePut(table, op.id, op.opData, now);
                        break;
                    case UpdateType.PATCH:
                        await this.handlePatch(table, op.id, op.opData, now);
                        break;
                    case UpdateType.DELETE:
                        await this.handleDelete(table, op.id, now);
                        break;
                }
            }

            // Mark transaction as complete
            await transaction.complete();
            console.log(`[PowerSync] Uploaded ${transaction.crud.length} operations`);
        } catch (error) {
            console.error('[PowerSync] Upload failed:', error);
            throw error;
        }
    }

    private async handlePut(table: string, id: string, opData: any, now: string) {
        const record = {
            ...opData,
            id,
            user_id: this.userId,
            updated_at: now,
        };

        let error;
        if (table === 'folders') {
            ({ error } = await supabase.from('folders').upsert(record, { onConflict: 'id' }));
        } else if (table === 'sessions') {
            ({ error } = await supabase.from('sessions').upsert(record, { onConflict: 'id' }));
        } else if (table === 'topic_configs') {
            ({ error } = await supabase.from('topic_configs').upsert(record, { onConflict: 'id' }));
        }

        if (error) {
            console.error(`[PowerSync] Upload PUT error for ${table}:`, error);
            throw error;
        }
    }

    private async handlePatch(table: string, id: string, opData: any, now: string) {
        const record = {
            ...opData,
            updated_at: now,
        };

        let error;
        if (table === 'folders') {
            ({ error } = await (supabase.from('folders') as any).update(record).eq('id', id));
        } else if (table === 'sessions') {
            ({ error } = await (supabase.from('sessions') as any).update(record).eq('id', id));
        } else if (table === 'topic_configs') {
            ({ error } = await (supabase.from('topic_configs') as any).update(record).eq('id', id));
        }

        if (error) {
            console.error(`[PowerSync] Upload PATCH error for ${table}:`, error);
            throw error;
        }
    }

    private async handleDelete(table: string, id: string, now: string) {
        const softDelete = { is_deleted: true, updated_at: now };

        let error;
        if (table === 'folders') {
            ({ error } = await (supabase.from('folders') as any).update(softDelete).eq('id', id));
        } else if (table === 'sessions') {
            ({ error } = await (supabase.from('sessions') as any).update(softDelete).eq('id', id));
        } else if (table === 'topic_configs') {
            // topic_configs doesn't have is_deleted, so do a real delete
            ({ error } = await (supabase.from('topic_configs') as any).delete().eq('id', id));
        }

        if (error) {
            console.error(`[PowerSync] Upload DELETE error for ${table}:`, error);
            throw error;
        }
    }
}
