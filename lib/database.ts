/**
 * Database Layer - PowerSync Implementation
 * All CRUD operations using PowerSync's local SQLite database
 */
import * as SecureStore from 'expo-secure-store';
import { db } from './powersync/database';

// ==================== TYPES ====================

export interface Folder {
    id: string;
    user_id: string;
    name: string;
    color: string;
    icon: string;
    created_at: string;
    updated_at: string;
    is_deleted: number;
}

export interface Session {
    id: string;
    user_id: string;
    topic: string;
    tags: string | null;
    folder_id: string | null;
    start_time: string;
    end_time: string | null;
    duration_seconds: number;
    created_at: string;
    updated_at: string;
    is_deleted: number;
    // Joined fields for UI
    folder_name?: string | null;
    folder_color?: string | null;
    folder_icon?: string | null;
    topic_color?: string | null;
}

export interface TopicConfig {
    id: string;
    user_id: string;
    topic: string;
    folder_id: string | null;
    allow_background: number;
    color: string | null;
    created_at: string;
    updated_at: string;
}

// Current user ID - set by the app
let currentUserId: string | null = null;

export function setCurrentUserId(userId: string | null) {
    currentUserId = userId;
}

export function getCurrentUserId(): string {
    if (!currentUserId) {
        throw new Error('User ID not set. Call setCurrentUserId first.');
    }
    return currentUserId;
}

// Generate UUID
function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ==================== SESSION CRUD ====================

export async function createSession(
    topic: string,
    tags?: string,
    folderId?: string
): Promise<string> {
    const id = uuid();
    const now = new Date().toISOString();
    const userId = getCurrentUserId();

    await db.execute(
        `INSERT INTO sessions (id, user_id, topic, tags, folder_id, start_time, duration_seconds, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0)`,
        [id, userId, topic, tags || null, folderId || null, now, now, now]
    );

    return id;
}

export async function endSession(id: string): Promise<void> {
    const now = new Date().toISOString();

    // Get start time to calculate duration
    const session = await db.getOptional<Session>(
        'SELECT * FROM sessions WHERE id = ?',
        [id]
    );

    if (session) {
        const start = new Date(session.start_time).getTime();
        const end = new Date(now).getTime();
        const durationSeconds = Math.floor((end - start) / 1000);

        await db.execute(
            'UPDATE sessions SET end_time = ?, duration_seconds = ?, updated_at = ? WHERE id = ?',
            [now, durationSeconds, now, id]
        );
    }
}

export async function getAllSessions(): Promise<Session[]> {
    const userId = getCurrentUserId();
    return db.getAll<Session>(
        `SELECT s.*, 
                f.name as folder_name, 
                f.color as folder_color, 
                f.icon as folder_icon,
                tc.color as topic_color
         FROM sessions s
         LEFT JOIN folders f ON s.folder_id = f.id AND f.is_deleted = 0
         LEFT JOIN topic_configs tc ON s.topic = tc.topic AND tc.user_id = s.user_id
         WHERE s.user_id = ? AND s.is_deleted = 0 AND s.duration_seconds > 0
         ORDER BY s.start_time DESC`,
        [userId]
    );
}

export async function getSessionsByDateRange(
    startDate: string,
    endDate: string
): Promise<Session[]> {
    const userId = getCurrentUserId();
    return db.getAll<Session>(
        `SELECT s.*, 
                f.name as folder_name, 
                f.color as folder_color, 
                f.icon as folder_icon,
                tc.color as topic_color
         FROM sessions s
         LEFT JOIN folders f ON s.folder_id = f.id AND f.is_deleted = 0
         LEFT JOIN topic_configs tc ON s.topic = tc.topic AND tc.user_id = s.user_id
         WHERE s.user_id = ? AND s.is_deleted = 0 
               AND s.start_time >= ? AND s.start_time <= ? 
               AND s.duration_seconds > 0
         ORDER BY s.start_time DESC`,
        [userId, startDate, endDate]
    );
}

export async function getTodaySessions(): Promise<Session[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getSessionsByDateRange(today.toISOString(), tomorrow.toISOString());
}

export async function getDailyStats(days: number = 30): Promise<Map<string, number>> {
    const userId = getCurrentUserId();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await db.getAll<Session>(
        `SELECT * FROM sessions 
         WHERE user_id = ? AND is_deleted = 0 
               AND start_time >= ? AND end_time IS NOT NULL
         ORDER BY start_time`,
        [userId, startDate.toISOString()]
    );

    const dailyMap = new Map<string, number>();
    sessions.forEach((session) => {
        const d = new Date(session.start_time);
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
        const current = dailyMap.get(localDate) || 0;
        dailyMap.set(localDate, current + (session.duration_seconds || 0));
    });

    return dailyMap;
}

export async function getTotalFocusTime(): Promise<number> {
    const userId = getCurrentUserId();
    const result = await db.getOptional<{ total: number }>(
        'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE user_id = ? AND is_deleted = 0 AND end_time IS NOT NULL',
        [userId]
    );
    return result?.total || 0;
}

export async function getCurrentStreak(): Promise<number> {
    const dailyStats = await getDailyStats(365);
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const offset = date.getTimezoneOffset() * 60000;
        const dateStr = new Date(date.getTime() - offset).toISOString().split('T')[0];

        if (dailyStats.has(dateStr) && (dailyStats.get(dateStr) || 0) > 0) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    return streak;
}

export async function getSessionsByTopic(topic: string): Promise<Session[]> {
    const userId = getCurrentUserId();
    return db.getAll<Session>(
        `SELECT s.*, 
                f.name as folder_name, 
                f.color as folder_color, 
                f.icon as folder_icon,
                tc.color as topic_color
         FROM sessions s
         LEFT JOIN folders f ON s.folder_id = f.id AND f.is_deleted = 0
         LEFT JOIN topic_configs tc ON s.topic = tc.topic AND tc.user_id = s.user_id
         WHERE s.user_id = ? AND s.topic = ? AND s.is_deleted = 0 AND s.duration_seconds > 0
         ORDER BY s.start_time DESC`,
        [userId, topic]
    );
}

export async function renameAllSessionsWithTopic(oldTopic: string, newTopic: string): Promise<void> {
    const userId = getCurrentUserId();
    const now = new Date().toISOString();
    await db.execute(
        'UPDATE sessions SET topic = ?, updated_at = ? WHERE user_id = ? AND topic = ?',
        [newTopic, now, userId, oldTopic]
    );
}

export async function deleteSession(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.execute(
        'UPDATE sessions SET is_deleted = 1, updated_at = ? WHERE id = ?',
        [now, id]
    );
}

export async function deleteTopic(topic: string): Promise<void> {
    const userId = getCurrentUserId();
    const now = new Date().toISOString();
    // Soft-delete all sessions with this topic
    await db.execute(
        'UPDATE sessions SET is_deleted = 1, updated_at = ? WHERE user_id = ? AND topic = ?',
        [now, userId, topic]
    );
    // Delete topic config (color, folder association)
    await db.execute(
        'DELETE FROM topic_configs WHERE user_id = ? AND topic = ?',
        [userId, topic]
    );
}

// ==================== FOLDER CRUD ====================

export async function createFolder(
    name: string,
    color: string = '#14b8a6',
    icon: string = 'folder'
): Promise<string> {
    const id = uuid();
    const now = new Date().toISOString();
    const userId = getCurrentUserId();

    await db.execute(
        `INSERT INTO folders (id, user_id, name, color, icon, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [id, userId, name, color, icon, now, now]
    );

    return id;
}

export async function getFolders(userId?: string): Promise<Folder[]> {
    const id = userId || getCurrentUserId();
    return db.getAll<Folder>(
        'SELECT * FROM folders WHERE user_id = ? AND is_deleted = 0 ORDER BY created_at DESC',
        [id]
    );
}

export async function getFolderById(id: string): Promise<Folder | null> {
    const result = await db.getOptional<Folder>(
        'SELECT * FROM folders WHERE id = ? AND is_deleted = 0',
        [id]
    );
    return result || null;
}

export async function updateFolder(
    id: string,
    name: string,
    color: string,
    icon: string
): Promise<void> {
    const now = new Date().toISOString();
    await db.execute(
        'UPDATE folders SET name = ?, color = ?, icon = ?, updated_at = ? WHERE id = ?',
        [name, color, icon, now, id]
    );
}

export async function deleteFolder(id: string): Promise<void> {
    const now = new Date().toISOString();
    // Remove folder reference from sessions
    await db.execute(
        'UPDATE sessions SET folder_id = NULL, updated_at = ? WHERE folder_id = ?',
        [now, id]
    );
    // Soft delete the folder
    await db.execute(
        'UPDATE folders SET is_deleted = 1, updated_at = ? WHERE id = ?',
        [now, id]
    );
}

export async function createTopicInFolder(topic: string, folderId: string, color?: string): Promise<void> {
    // Create topic config with folder association (no dummy session)
    await upsertTopicConfig(topic, false, color, folderId);
}

export async function getTopicsByFolder(folderId: string, userId?: string): Promise<{ topic: string; totalTime: number; sessionCount: number; lastSession: string; color: string | null }[]> {
    const id = userId || getCurrentUserId();
    return db.getAll(
        `SELECT 
            tc.topic,
            COALESCE(SUM(s.duration_seconds), 0) as totalTime,
            COUNT(CASE WHEN s.duration_seconds > 0 THEN 1 END) as sessionCount,
            MAX(s.start_time) as lastSession,
            tc.color
        FROM topic_configs tc
        LEFT JOIN sessions s ON s.topic = tc.topic AND s.user_id = tc.user_id AND s.is_deleted = 0 AND s.end_time IS NOT NULL
        WHERE tc.folder_id = ? AND tc.user_id = ?
        GROUP BY tc.topic, tc.color
        ORDER BY lastSession DESC`,
        [folderId, id]
    );
}

export async function getAllFolderTopics(userId?: string): Promise<{ folder_id: string; topic: string; totalTime: number; sessionCount: number; lastSession: string; color: string | null }[]> {
    const id = userId || getCurrentUserId();
    return db.getAll(
        `SELECT 
            tc.folder_id,
            tc.topic,
            COALESCE(SUM(s.duration_seconds), 0) as totalTime,
            COUNT(CASE WHEN s.duration_seconds > 0 THEN 1 END) as sessionCount,
            MAX(s.start_time) as lastSession,
            tc.color
        FROM topic_configs tc
        LEFT JOIN sessions s ON s.topic = tc.topic AND s.user_id = tc.user_id AND s.is_deleted = 0 AND s.end_time IS NOT NULL
        WHERE tc.folder_id IS NOT NULL AND tc.user_id = ?
        GROUP BY tc.folder_id, tc.topic, tc.color
        ORDER BY lastSession DESC`,
        [id]
    );
}

export async function getUnfolderedTopics(userId?: string): Promise<{ topic: string; totalTime: number; sessionCount: number; lastSession: string; color: string | null }[]> {
    const id = userId || getCurrentUserId();
    // Get topics from sessions that don't have a topic_config with a folder
    return db.getAll(
        `SELECT 
            s.topic,
            COALESCE(SUM(s.duration_seconds), 0) as totalTime,
            COUNT(CASE WHEN s.duration_seconds > 0 THEN 1 END) as sessionCount,
            MAX(s.start_time) as lastSession,
            tc.color
        FROM sessions s
        LEFT JOIN topic_configs tc ON s.topic = tc.topic AND tc.user_id = s.user_id
        WHERE s.user_id = ? AND s.is_deleted = 0 AND s.end_time IS NOT NULL
              AND (tc.folder_id IS NULL OR tc.id IS NULL)
        GROUP BY s.topic, tc.color
        ORDER BY lastSession DESC`,
        [id]
    );
}

export async function assignTopicToFolder(topic: string, folderId: string | null): Promise<void> {
    const userId = getCurrentUserId();
    const now = new Date().toISOString();
    // Update folder assignment in topic_configs (not sessions)
    const existing = await db.getOptional<TopicConfig>(
        'SELECT * FROM topic_configs WHERE user_id = ? AND topic = ?',
        [userId, topic]
    );
    if (existing) {
        await db.execute(
            'UPDATE topic_configs SET folder_id = ?, updated_at = ? WHERE id = ?',
            [folderId, now, existing.id]
        );
    } else {
        // Create topic config if it doesn't exist
        await upsertTopicConfig(topic, false, undefined, folderId);
    }
}

export async function getFolderStats(folderId: string, userId?: string): Promise<{ totalTime: number; sessionCount: number; topicCount: number }> {
    const id = userId || getCurrentUserId();
    const result = await db.getOptional<{ totalTime: number; sessionCount: number; topicCount: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COUNT(DISTINCT topic) as topicCount
        FROM sessions 
        WHERE folder_id = ? AND user_id = ? AND is_deleted = 0 AND end_time IS NOT NULL`,
        [folderId, id]
    );
    return result || { totalTime: 0, sessionCount: 0, topicCount: 0 };
}

export async function getTopicStats(topic: string): Promise<{ totalTime: number; sessionCount: number; averageTime: number }> {
    const userId = getCurrentUserId();
    const result = await db.getOptional<{ totalTime: number; sessionCount: number; averageTime: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COALESCE(AVG(duration_seconds), 0) as averageTime
        FROM sessions 
        WHERE topic = ? AND user_id = ? AND is_deleted = 0 AND end_time IS NOT NULL`,
        [topic, userId]
    );
    return result || { totalTime: 0, sessionCount: 0, averageTime: 0 };
}

export async function getTopicDailyStats(topic: string, days: number = 30): Promise<Map<string, number>> {
    const userId = getCurrentUserId();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await db.getAll<Session>(
        `SELECT * FROM sessions 
         WHERE topic = ? AND user_id = ? AND is_deleted = 0 
               AND start_time >= ? AND end_time IS NOT NULL
         ORDER BY start_time`,
        [topic, userId, startDate.toISOString()]
    );

    const dailyMap = new Map<string, number>();
    sessions.forEach((session) => {
        const d = new Date(session.start_time);
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
        const current = dailyMap.get(localDate) || 0;
        dailyMap.set(localDate, current + (session.duration_seconds || 0));
    });

    return dailyMap;
}

export async function getTopicDailyStatsForRange(topic: string, startDate: string, endDate: string): Promise<Map<string, number>> {
    const userId = getCurrentUserId();
    const sessions = await db.getAll<Session>(
        `SELECT * FROM sessions 
         WHERE topic = ? AND user_id = ? AND is_deleted = 0 
               AND start_time >= ? AND start_time <= ? AND end_time IS NOT NULL
         ORDER BY start_time`,
        [topic, userId, startDate, endDate]
    );

    const dailyMap = new Map<string, number>();
    sessions.forEach((session) => {
        const d = new Date(session.start_time);
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
        const current = dailyMap.get(localDate) || 0;
        dailyMap.set(localDate, current + (session.duration_seconds || 0));
    });

    return dailyMap;
}

export async function getFolderDailyStatsForRange(folderId: string, startDate: string, endDate: string): Promise<Map<string, number>> {
    const userId = getCurrentUserId();
    const sessions = await db.getAll<Session>(
        `SELECT * FROM sessions 
         WHERE folder_id = ? AND user_id = ? AND is_deleted = 0 
               AND start_time >= ? AND start_time <= ? AND end_time IS NOT NULL
         ORDER BY start_time`,
        [folderId, userId, startDate, endDate]
    );

    const dailyMap = new Map<string, number>();
    sessions.forEach((session) => {
        const d = new Date(session.start_time);
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
        const current = dailyMap.get(localDate) || 0;
        dailyMap.set(localDate, current + (session.duration_seconds || 0));
    });

    return dailyMap;
}

export async function getFolderDailyStats(folderId: string, days: number = 30): Promise<Map<string, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    return getFolderDailyStatsForRange(folderId, startDate.toISOString(), endDate.toISOString());
}

export async function moveTopicToFolder(topic: string, folderId: string): Promise<void> {
    return assignTopicToFolder(topic, folderId);
}

export async function getTopicStatsForRange(topic: string, startDate: string, endDate: string): Promise<{ totalTime: number; sessionCount: number; averageTime: number }> {
    const userId = getCurrentUserId();
    const result = await db.getOptional<{ totalTime: number; sessionCount: number; averageTime: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COALESCE(AVG(duration_seconds), 0) as averageTime
        FROM sessions 
        WHERE topic = ? AND user_id = ? AND is_deleted = 0 
              AND start_time >= ? AND start_time <= ? AND end_time IS NOT NULL`,
        [topic, userId, startDate, endDate]
    );
    return result || { totalTime: 0, sessionCount: 0, averageTime: 0 };
}

export async function getFolderStatsForRange(folderId: string, startDate: string, endDate: string): Promise<{ totalTime: number; sessionCount: number; topicCount: number }> {
    const userId = getCurrentUserId();
    const result = await db.getOptional<{ totalTime: number; sessionCount: number; topicCount: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COUNT(DISTINCT topic) as topicCount
        FROM sessions 
        WHERE folder_id = ? AND user_id = ? AND is_deleted = 0 
              AND start_time >= ? AND start_time <= ? AND end_time IS NOT NULL`,
        [folderId, userId, startDate, endDate]
    );
    return result || { totalTime: 0, sessionCount: 0, topicCount: 0 };
}

export async function getStatsForRange(startDate: string, endDate: string): Promise<{ totalTime: number; sessionCount: number; averageTime: number }> {
    const userId = getCurrentUserId();
    const result = await db.getOptional<{ totalTime: number; sessionCount: number; averageTime: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COALESCE(AVG(duration_seconds), 0) as averageTime
        FROM sessions 
        WHERE user_id = ? AND is_deleted = 0 
              AND start_time >= ? AND start_time <= ? AND end_time IS NOT NULL`,
        [userId, startDate, endDate]
    );
    return result || { totalTime: 0, sessionCount: 0, averageTime: 0 };
}

// ==================== TOPIC CONFIGS (Colors) ====================

export async function upsertTopicConfig(
    topic: string,
    allowBackground: boolean,
    color?: string,
    folderId?: string | null
): Promise<void> {
    const userId = getCurrentUserId();
    const now = new Date().toISOString();

    // Check if exists
    const existing = await db.getOptional<TopicConfig>(
        'SELECT * FROM topic_configs WHERE user_id = ? AND topic = ?',
        [userId, topic]
    );

    if (existing) {
        const newColor = color !== undefined ? color : existing.color;
        const newFolderId = folderId !== undefined ? folderId : existing.folder_id;
        await db.execute(
            'UPDATE topic_configs SET allow_background = ?, color = ?, folder_id = ?, updated_at = ? WHERE id = ?',
            [allowBackground ? 1 : 0, newColor, newFolderId, now, existing.id]
        );
    } else {
        const id = uuid();
        await db.execute(
            `INSERT INTO topic_configs (id, user_id, topic, folder_id, allow_background, color, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, topic, folderId || null, allowBackground ? 1 : 0, color || null, now, now]
        );
    }
}

export async function getTopicConfig(topic: string): Promise<{ allowBackground: boolean; color: string | null }> {
    const userId = getCurrentUserId();
    const result = await db.getOptional<TopicConfig>(
        'SELECT * FROM topic_configs WHERE user_id = ? AND topic = ?',
        [userId, topic]
    );
    return { allowBackground: !!result?.allow_background, color: result?.color || null };
}

// ==================== APP STATE (for session recovery) ====================

// Prefix for app state keys in SecureStore
const APP_STATE_PREFIX = 'app_state_';

export async function setAppState(key: string, value: string): Promise<void> {
    try {
        if (value) {
            await SecureStore.setItemAsync(APP_STATE_PREFIX + key, value);
        } else {
            // Delete if empty value
            await SecureStore.deleteItemAsync(APP_STATE_PREFIX + key);
        }
    } catch (error) {
        console.warn('[AppState] Failed to save:', key, error);
    }
}

export async function getAppState(key: string): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(APP_STATE_PREFIX + key);
    } catch (error) {
        console.warn('[AppState] Failed to read:', key, error);
        return null;
    }
}

export async function recoverUnfinishedSession(): Promise<boolean> {
    const userId = getCurrentUserId();

    // Find any session that has no end_time
    const unfinished = await db.getOptional<Session>(
        'SELECT * FROM sessions WHERE user_id = ? AND end_time IS NULL AND is_deleted = 0 ORDER BY start_time DESC LIMIT 1',
        [userId]
    );

    if (unfinished) {
        const lastActiveStr = await getAppState('last_active_timestamp');
        let endTimeStr = new Date().toISOString();

        if (lastActiveStr) {
            endTimeStr = new Date(parseInt(lastActiveStr)).toISOString();
        } else {
            endTimeStr = unfinished.start_time; // 0 duration if no last active
        }

        const start = new Date(unfinished.start_time).getTime();
        const end = new Date(endTimeStr).getTime();
        const durationSeconds = Math.max(0, Math.floor((end - start) / 1000));

        await db.execute(
            'UPDATE sessions SET end_time = ?, duration_seconds = ?, updated_at = ? WHERE id = ?',
            [endTimeStr, durationSeconds, new Date().toISOString(), unfinished.id]
        );
        return true;
    }
    return false;
}

// ==================== HOOKS (Removed - use PowerSync hooks instead) ====================
// useDatabase() hook removed - PowerSync handles initialization via PowerSyncProvider
