
import {
    getAllSessions,
    getAppState,
    getDatabase,
    getFolderByCloudId,
    getFolders,
    getSessionByCloudId,
    setAppState,
    setFolderCloudId,
    setSessionCloudId
} from './database';
import { supabase } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResult {
    success: boolean;
    sessionsUploaded: number;
    sessionsDownloaded: number;
    foldersUploaded: number;
    foldersDownloaded: number;
    error?: string;
}

// ==================== SYNC ENGINE ====================

let isSyncRunning = false;

/**
 * Main sync function - syncs all data bidirectionally
 */
export async function syncAll(userId: string): Promise<SyncResult> {
    if (isSyncRunning) {
        console.log('[Sync] Sync already in progress, skipping.');
        return {
            success: true,
            sessionsUploaded: 0,
            sessionsDownloaded: 0,
            foldersUploaded: 0,
            foldersDownloaded: 0
        };
    }

    isSyncRunning = true;

    const result: SyncResult = {
        success: false,
        sessionsUploaded: 0,
        sessionsDownloaded: 0,
        foldersUploaded: 0,
        foldersDownloaded: 0,
    };

    try {
        // 0. Deduplicate local data (fix previous race conditions)
        await deduplicateData();

        // Get last sync time
        const lastSyncTime = await getLastSyncTime(userId);

        // 1. Sync folders first (sessions depend on folders)
        const folderResult = await syncFolders(userId, lastSyncTime);
        result.foldersUploaded = folderResult.uploaded;
        result.foldersDownloaded = folderResult.downloaded;

        // 2. Sync sessions
        const sessionResult = await syncSessions(userId, lastSyncTime);
        result.sessionsUploaded = sessionResult.uploaded;
        result.sessionsDownloaded = sessionResult.downloaded;

        // 3. Update last sync time
        await updateLastSyncTime(userId);

        result.success = true;
        return result;
    } catch (error: any) {
        console.error('Sync error:', error);
        result.error = error.message || 'Sync failed';
        return result;
    } finally {
        isSyncRunning = false;
    }
}

/**
 * Cleanup duplicates caused by race conditions
 */
async function deduplicateData() {
    console.log('[Sync] Checking for duplicates...');
    const db = await getDatabase();

    // 1. Deduplicate Folders
    const duplicateFolders = await db.getAllAsync<{ cloud_id: string, count: number }>(`
        SELECT cloud_id, COUNT(*) as count 
        FROM folders 
        WHERE cloud_id IS NOT NULL 
        GROUP BY cloud_id 
        HAVING count > 1
    `);

    for (const dup of duplicateFolders) {
        // Get all folders with this cloud_id
        const folders = await db.getAllAsync<{ id: number }>(
            'SELECT id FROM folders WHERE cloud_id = ? ORDER BY id ASC',
            dup.cloud_id
        );

        if (folders.length > 1) {
            const primary = folders[0];
            const toDelete = folders.slice(1);

            console.log(`[Sync] Merging ${toDelete.length} duplicate folders into ${primary.id}`);

            for (const del of toDelete) {
                // Move sessions to primary
                await db.runAsync('UPDATE sessions SET folder_id = ? WHERE folder_id = ?', primary.id, del.id);
                // Delete duplicate
                await db.runAsync('DELETE FROM folders WHERE id = ?', del.id);
            }
        }
    }

    // 2. Deduplicate Sessions
    const duplicateSessions = await db.getAllAsync<{ cloud_id: string, count: number }>(`
        SELECT cloud_id, COUNT(*) as count 
        FROM sessions 
        WHERE cloud_id IS NOT NULL 
        GROUP BY cloud_id 
        HAVING count > 1
    `);

    for (const dup of duplicateSessions) {
        const sessions = await db.getAllAsync<{ id: number }>(
            'SELECT id FROM sessions WHERE cloud_id = ? ORDER BY id ASC',
            dup.cloud_id
        );

        if (sessions.length > 1) {
            const primary = sessions[0];
            const toDelete = sessions.slice(1);

            console.log(`[Sync] Removing ${toDelete.length} duplicate sessions, keeping ${primary.id}`);

            for (const del of toDelete) {
                await db.runAsync('DELETE FROM sessions WHERE id = ?', del.id);
            }
        }
    }
}

// ==================== FOLDER SYNC ====================

async function syncFolders(
    userId: string,
    lastSyncTime: Date | null
): Promise<{ uploaded: number; downloaded: number }> {
    let uploaded = 0;
    let downloaded = 0;

    // 1. Get local folders
    const localFolders = await getFolders();
    console.log('[Sync] Local folders count:', localFolders.length);

    // 2. Upload local folders to cloud
    for (const folder of localFolders) {
        // ... (upload logic) ...
        const cloudFolder: any = {
            id: folder.cloud_id || undefined, // Use UUID if we have it
            user_id: userId,
            local_id: folder.id, // Keep reference for legacy checks
            name: folder.name,
            color: folder.color,
            icon: folder.icon,
            created_at: folder.created_at,
        };

        const { data, error } = await supabase
            .from('folders')
            .upsert(cloudFolder, {
                onConflict: folder.cloud_id ? 'id' : 'user_id,local_id', // Fallback to local_id constraint for backward compat
                ignoreDuplicates: false
            })
            .select() // Return the row so we get the ID
            .single();

        if (!error && (data as any)) {
            const resultData = data as any;
            uploaded++;
            // If we didn't have a cloud_id before, save it now
            if (!folder.cloud_id) {
                await setFolderCloudId(folder.id, resultData.id);
            }
        } else if (error && error.code === '23505') {
            // Duplicate key (legacy sync conflict OR name collision). Resolve by linking.
            console.log('Resolving duplicate folder:', folder.name);

            // 1. Try to find by local_id (Legacy sync case)
            let { data: existing } = await supabase
                .from('folders')
                .select('id')
                .eq('user_id', userId)
                .eq('local_id', folder.id)
                .maybeSingle() as { data: { id: string } | null };

            // 2. If not found by local_id, try by NAME (Name collision case)
            if (!existing) {
                const { data: existingByName } = await supabase
                    .from('folders')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('name', folder.name)
                    .maybeSingle() as { data: { id: string } | null };
                existing = existingByName;
            }

            if (existing) {
                await setFolderCloudId(folder.id, existing.id);
                // We don't try to update the cloud record's local_id here, 
                // we just accept the Cloud ID as truth.
                uploaded++;
            }
        }
    }

    // 3. Download new folders from cloud (created on other devices)
    const query = supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false);

    // SELF-HEALING: If we have NO local folders, we should ignore lastSyncTime 
    // and fetch everything to ensure we aren't in a broken state.
    if (lastSyncTime && localFolders.length > 0) {
        query.gt('updated_at', lastSyncTime.toISOString());
    } else if (localFolders.length === 0 && lastSyncTime) {
        console.log('[Sync] Local folders empty but lastSyncTime exists. Forcing full download.');
    }

    const { data: cloudFolders, error: downloadError } = await query;

    console.log('[Sync] Cloud folders found:', cloudFolders?.length);

    if (downloadError) {
        console.error('Failed to download folders:', downloadError);
    } else if (cloudFolders) {
        for (const cloudFolder of cloudFolders as any[]) {
            console.log('[Sync] Processing cloud folder:', cloudFolder.name, cloudFolder.id);
            // Check if we already have this folder locally using UUID
            const existingLocal = await getFolderByCloudId(cloudFolder.id);

            if (!existingLocal) {
                // Also check by local_id just in case of legacy sync without UUID
                const legacyMatch = localFolders.find(f => f.id === cloudFolder.local_id && !f.cloud_id);
                if (legacyMatch) {
                    await setFolderCloudId(legacyMatch.id, cloudFolder.id);
                    continue;
                }

                // New folder from another device - insert locally
                console.log('[Sync] Inserting new folder locally:', cloudFolder.name);
                try {
                    const db = await getDatabase();
                    await db.runAsync(
                        'INSERT INTO folders (name, color, icon, created_at, cloud_id) VALUES (?, ?, ?, ?, ?)',
                        cloudFolder.name, cloudFolder.color, cloudFolder.icon, cloudFolder.created_at, cloudFolder.id
                    );
                    downloaded++;
                    console.log('[Sync] Insert successful.');
                } catch (e) {
                    console.warn('Failed to insert cloud folder locally:', e);
                }
            } else {
                console.log('[Sync] Folder already exists locally:', existingLocal.id);
            }
        }
    }

    return { uploaded, downloaded };
}

// ==================== SESSION SYNC ====================

async function syncSessions(
    userId: string,
    lastSyncTime: Date | null
): Promise<{ uploaded: number; downloaded: number }> {
    let uploaded = 0;
    let downloaded = 0;

    // 1. Get local sessions (only completed ones)
    const localSessions = await getAllSessions();
    // Get folders to map IDs
    const localFolders = await getFolders();
    const folderIdToCloudId = new Map<number, string>();
    const cloudIdToFolderId = new Map<string, number>();

    for (const f of localFolders) {
        if (f.cloud_id) {
            folderIdToCloudId.set(f.id, f.cloud_id);
            cloudIdToFolderId.set(f.cloud_id, f.id);
        }
    }

    // 2. Upload local sessions to cloud
    for (const session of localSessions) {
        if (!session.end_time || session.duration_seconds === 0) {
            continue; // Skip incomplete sessions
        }

        // Only upload if modified locally since last sync
        // If updated_at is missing (legacy), we assume it might be new/changed so we upload.
        // If cloud_id exists AND updated_at exists AND it's older than lastSyncTime -> SKIP
        if (session.cloud_id && (session as any).updated_at && lastSyncTime) {
            const updatedAt = new Date((session as any).updated_at);
            if (updatedAt < lastSyncTime) {
                // Not modified locally since last sync
                continue;
            }
        }

        // Resolve folder cloud ID
        let folderCloudId: string | null = null;
        if (session.folder_id) {
            folderCloudId = folderIdToCloudId.get(session.folder_id) || null;
            // If folder has no cloud_id yet (creation failed?), we can't link it securely yet.
            // But syncFolders should have successfully run before this.
        }

        const cloudSession: any = {
            id: session.cloud_id || undefined,
            user_id: userId,
            local_id: session.id,
            topic: session.topic,
            tags: session.tags,
            folder_id: folderCloudId, // Map to UUID
            start_time: session.start_time,
            end_time: session.end_time,
            duration_seconds: session.duration_seconds,
            updated_at: session.updated_at || undefined, // Send local updated_at to cloud
        };

        const { data, error } = await supabase
            .from('sessions')
            .upsert(cloudSession, {
                onConflict: session.cloud_id ? 'id' : 'user_id,local_id',
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (!error && (data as any)) {
            const resultData = data as any;
            uploaded++;
            if (!session.cloud_id) {
                await setSessionCloudId(session.id, resultData.id);
            }
        } else if (error && error.code === '23505') {
            // Duplicate key violation (likely user_id, local_id)
            // This means we have this session in cloud but locally we missed the cloud_id link.
            // Let's fetch it and link it.
            console.log('Resolving duplicate session:', session.topic);
            const { data: existing } = await supabase
                .from('sessions')
                .select('id')
                .eq('user_id', userId)
                .eq('local_id', session.id)
                .single() as { data: { id: string } | null };

            if (existing) {
                await setSessionCloudId(session.id, existing.id);
                // Retry upload is not strictly needed as it's already there, 
                // but we linked it now for next time.
                uploaded++;
            }
        } else {
            console.warn('Failed to upload session:', session.topic, error);
        }
    }

    // 3. Download new sessions from cloud
    const query = supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false);

    if (lastSyncTime) {
        query.gt('updated_at', lastSyncTime.toISOString());
    }

    const { data: cloudSessions, error: downloadError } = await query;

    console.log('[Sync] Cloud sessions found:', cloudSessions?.length);

    if (downloadError) {
        console.error('Failed to download sessions:', downloadError);
    } else if (cloudSessions) {
        // const localSessionIds = new Set(localSessions.map(s => s.id)); // No longer needed with cloud_id check

        for (const cloudSession of cloudSessions as any[]) {
            console.log('[Sync] Processing cloud session:', cloudSession.topic, cloudSession.id);
            // Check if we already have this session locally by UUID
            const existingLocal = await getSessionByCloudId(cloudSession.id);

            // Resolve local folder ID from cloud folder UUID
            let localFolderId: number | null = null;
            if (cloudSession.folder_id) {
                localFolderId = cloudIdToFolderId.get(cloudSession.folder_id) || null;
                // If we don't have the folder locally yet, it might be in the folder sync batch
                // But syncFolders runs BEFORE syncSessions, so we should have it IF it exists.
            }

            if (!existingLocal) {
                // Check legacy match
                const legacyMatch = localSessions.find(s => s.id === cloudSession.local_id && !s.cloud_id);
                if (legacyMatch) {
                    await setSessionCloudId(legacyMatch.id, cloudSession.id);
                    // Update folder_id if it was missing/changed
                    if (localFolderId && legacyMatch.folder_id !== localFolderId) {
                        const db = await getDatabase();
                        await db.runAsync(
                            'UPDATE sessions SET folder_id = ? WHERE id = ?',
                            localFolderId, legacyMatch.id
                        );
                        console.log('[Sync] Fixed folder link for legacy match:', legacyMatch.topic);
                    }
                    continue;
                }

                // New session from another device - insert locally
                try {
                    const db = await getDatabase(); // Fetch fresh reference
                    await db.runAsync(
                        `INSERT INTO sessions (topic, tags, folder_id, start_time, end_time, duration_seconds, cloud_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        cloudSession.topic,
                        cloudSession.tags ?? null,
                        localFolderId ?? null,
                        cloudSession.start_time,
                        cloudSession.end_time,
                        cloudSession.duration_seconds,
                        cloudSession.id
                    );
                    downloaded++;
                } catch (e) {
                    console.warn('Failed to insert cloud session locally:', e);
                }
            } else {
                // Update existing session
                if (localFolderId && existingLocal.folder_id !== localFolderId) {
                    console.log(`[Sync] Updating folder link for session ${existingLocal.topic}: ${existingLocal.folder_id} -> ${localFolderId}`);
                    // Fix the link locally!
                    const db = await getDatabase();
                    await db.runAsync(
                        'UPDATE sessions SET folder_id = ? WHERE id = ?',
                        localFolderId, existingLocal.id
                    );
                    console.log('[Sync] Link updated.');
                } else if (localFolderId) {
                    // Debug: Why didn't we update?
                    // console.log(`[Sync] Session ${existingLocal.topic} already linked correctly to ${localFolderId}`);
                }
            }
        }
    }

    return { uploaded, downloaded };
}

// ==================== SYNC STATE MANAGEMENT ====================

// ==================== SYNC STATE MANAGEMENT ====================

async function getLastSyncTime(userId: string): Promise<Date | null> {
    // We used to fetch from Supabase 'sync_state', but that is GLOBAL for the user.
    // We need LOCAL sync state for THIS device.
    // Use app_state table.
    const lastSyncStr = await getAppState('last_sync_time');
    if (!lastSyncStr) {
        return null;
    }
    return new Date(lastSyncStr);
}

async function updateLastSyncTime(userId: string): Promise<void> {
    const now = new Date().toISOString();

    // 1. Update LOCAL state
    await setAppState('last_sync_time', now);


    // 2. Update CLOUD state (informative only, or for "last active" status)
    // We don't await this strictly to speed up UI, but good to keep it.
    await supabase
        .from('sync_state')
        .upsert({
            user_id: userId,
            last_sync_at: now,
            sessions_sync_at: now,
            folders_sync_at: now,
        } as any, { onConflict: 'user_id' });
}

// ==================== CLOUD STATS ====================

/**
 * Get aggregated stats from cloud for cross-device insights
 */
export async function getCloudStats(userId: string): Promise<{
    totalSessions: number;
    totalFocusTime: number;
    totalTopics: number;
    devices: number;
}> {
    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('duration_seconds, topic')
        .eq('user_id', userId)
        .eq('is_deleted', false);

    if (error || !sessions) {
        return { totalSessions: 0, totalFocusTime: 0, totalTopics: 0, devices: 1 };
    }

    const sessionData = sessions as any[];

    const totalSessions = sessionData.length;
    const totalFocusTime = sessionData.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
    const uniqueTopics = new Set(sessionData.map(s => s.topic)).size;

    return {
        totalSessions,
        totalFocusTime,
        totalTopics: uniqueTopics,
        devices: 1 // Can't easily calculate devices without a device table
    };
}

/**
 * Check if sync is available (user is authenticated)
 */
export function isSyncAvailable(userId: string | null | undefined): boolean {
    return !!userId;
}
