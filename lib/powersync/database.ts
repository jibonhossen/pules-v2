/**
 * PowerSync Database Instance
 * Creates and exports the PowerSync database singleton
 */
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './schema';

// Use OP-SQLite for better performance and New Architecture support
const opSqlite = new OPSqliteOpenFactory({
    dbFilename: 'pules-powersync.db',
});

// Create the PowerSync database instance
export const db = new PowerSyncDatabase({
    schema: AppSchema,
    database: opSqlite,
});

// Track initialization state
let isInitialized = false;

/**
 * Initialize the PowerSync database
 * Must be called before using the database
 */
export async function initPowerSync(): Promise<void> {
    if (isInitialized) return;

    await db.init();
    isInitialized = true;
    console.log('[PowerSync] Database initialized');
}

/**
 * Check if PowerSync is connected to the sync service
 */
export function isConnected(): boolean {
    return db.connected;
}

/**
 * Get the current sync status
 */
export function getSyncStatus() {
    return db.currentStatus;
}
