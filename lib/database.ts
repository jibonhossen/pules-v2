import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';

export interface Folder {
    id: number;
    name: string;
    color: string;
    icon: string;
    created_at: string;
}

export interface Session {
    id: number;
    topic: string;
    tags: string | null;
    folder_id: number | null;
    start_time: string;
    end_time: string | null;
    duration_seconds: number;
    // Joined fields
    folder_name?: string | null;
    folder_color?: string | null;
    folder_icon?: string | null;
    topic_color?: string | null;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = (async () => {
        const db = await SQLite.openDatabaseAsync('pulse.db');

        // Create folders table
        await db.execAsync(`
        CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#14b8a6',
          icon TEXT DEFAULT 'folder',
          created_at TEXT NOT NULL
        );
      `);

        // Create sessions table
        await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic TEXT NOT NULL,
          tags TEXT,
          folder_id INTEGER REFERENCES folders(id),
          start_time TEXT NOT NULL,
          end_time TEXT,
          duration_seconds INTEGER DEFAULT 0
        );

        -- Create app_state table for persistence
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        -- Create topic_configs table
        CREATE TABLE IF NOT EXISTS topic_configs (
          topic TEXT PRIMARY KEY,
          allow_background INTEGER DEFAULT 0,
          color TEXT
        );
      `);

        // Try to add folder_id column if it doesn't exist (for existing databases)
        try {
            await db.execAsync(`ALTER TABLE sessions ADD COLUMN folder_id INTEGER REFERENCES folders(id);`);
        } catch (e) {
            // Column already exists, ignore
        }

        // Try to add color column to topic_configs if it doesn't exist
        try {
            await db.execAsync(`ALTER TABLE topic_configs ADD COLUMN color TEXT;`);
        } catch (e) {
            // Column already exists, ignore
        }



        return db;
    })();

    return dbPromise;
}

// Hook to initialize database
export function useDatabase() {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        getDatabase()
            .then(() => setIsReady(true))
            .catch((err) => setError(err));
    }, []);

    return { isReady, error };
}

// Session CRUD operations
export async function createSession(topic: string, tags?: string, folderId?: number): Promise<number> {
    const database = await getDatabase();
    const startTime = new Date().toISOString();

    const result = await database.runAsync(
        'INSERT INTO sessions (topic, tags, folder_id, start_time) VALUES (?, ?, ?, ?)',
        [topic, tags || null, folderId || null, startTime]
    );

    return result.lastInsertRowId;
}

export async function endSession(id: number): Promise<void> {
    const database = await getDatabase();
    const endTime = new Date().toISOString();

    // Get start time to calculate duration
    const session = await database.getFirstAsync<Session>(
        'SELECT * FROM sessions WHERE id = ?',
        [id]
    );

    if (session) {
        const start = new Date(session.start_time).getTime();
        const end = new Date(endTime).getTime();
        const durationSeconds = Math.floor((end - start) / 1000);

        await database.runAsync(
            'UPDATE sessions SET end_time = ?, duration_seconds = ? WHERE id = ?',
            [endTime, durationSeconds, id]
        );
    }
}

export async function getAllSessions(): Promise<Session[]> {
    const database = await getDatabase();
    return database.getAllAsync<Session>(
        `SELECT sessions.*, folders.name as folder_name, folders.color as folder_color, folders.icon as folder_icon, topic_configs.color as topic_color 
         FROM sessions 
         LEFT JOIN folders ON sessions.folder_id = folders.id 
         LEFT JOIN topic_configs ON sessions.topic = topic_configs.topic
         WHERE duration_seconds > 0
         ORDER BY start_time DESC`
    );
}

export async function getSessionsByDateRange(
    startDate: string,
    endDate: string
): Promise<Session[]> {
    const database = await getDatabase();
    return database.getAllAsync<Session>(
        `SELECT sessions.*, folders.name as folder_name, folders.color as folder_color, folders.icon as folder_icon, topic_configs.color as topic_color 
         FROM sessions 
         LEFT JOIN folders ON sessions.folder_id = folders.id 
         LEFT JOIN topic_configs ON sessions.topic = topic_configs.topic
         WHERE start_time >= ? AND start_time <= ? AND duration_seconds > 0
         ORDER BY start_time DESC`,
        [startDate, endDate]
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
    const database = await getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await database.getAllAsync<Session>(
        `SELECT * FROM sessions 
     WHERE start_time >= ? AND end_time IS NOT NULL
     ORDER BY start_time`,
        [startDate.toISOString()]
    );

    const dailyMap = new Map<string, number>();

    sessions.forEach((session) => {
        // Convert to local date string YYYY-MM-DD
        const d = new Date(session.start_time);
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset).toISOString().split('T')[0];

        const current = dailyMap.get(localDate) || 0;
        dailyMap.set(localDate, current + (session.duration_seconds || 0));
    });

    return dailyMap;
}

export async function getTotalFocusTime(): Promise<number> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE end_time IS NOT NULL'
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
        // Correct local date string logic
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

// Get all sessions for a specific topic
export async function getSessionsByTopic(topic: string): Promise<Session[]> {
    const database = await getDatabase();
    return database.getAllAsync<Session>(
        `SELECT sessions.*, folders.name as folder_name, folders.color as folder_color, folders.icon as folder_icon, topic_configs.color as topic_color 
         FROM sessions 
         LEFT JOIN folders ON sessions.folder_id = folders.id 
         LEFT JOIN topic_configs ON sessions.topic = topic_configs.topic
         WHERE sessions.topic = ? AND duration_seconds > 0
         ORDER BY start_time DESC`,
        [topic]
    );
}

// Update all sessions with a specific topic to a new topic name
export async function renameAllSessionsWithTopic(oldTopic: string, newTopic: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
        'UPDATE sessions SET topic = ? WHERE topic = ?',
        [newTopic, oldTopic]
    );
}

// Delete a session by ID
export async function deleteSession(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

// Delete all sessions for a specific topic
export async function deleteTopic(topic: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM sessions WHERE topic = ?', [topic]);
}

// ==================== FOLDER FUNCTIONS ====================

// Create a new folder
export async function createFolder(name: string, color: string = '#14b8a6', icon: string = 'folder'): Promise<number> {
    const database = await getDatabase();
    const createdAt = new Date().toISOString();

    const result = await database.runAsync(
        'INSERT INTO folders (name, color, icon, created_at) VALUES (?, ?, ?, ?)',
        [name, color, icon, createdAt]
    );

    return result.lastInsertRowId;
}

// Get all folders
export async function getFolders(): Promise<Folder[]> {
    const database = await getDatabase();
    return database.getAllAsync<Folder>(
        'SELECT * FROM folders ORDER BY created_at DESC'
    );
}

// Get a folder by ID
export async function getFolderById(id: number): Promise<Folder | null> {
    const database = await getDatabase();
    return database.getFirstAsync<Folder>(
        'SELECT * FROM folders WHERE id = ?',
        [id]
    );
}

// Update folder
export async function updateFolder(id: number, name: string, color: string, icon: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
        'UPDATE folders SET name = ?, color = ?, icon = ? WHERE id = ?',
        [name, color, icon, id]
    );
}

// Delete folder (also removes folder_id from associated sessions)
export async function deleteFolder(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('UPDATE sessions SET folder_id = NULL WHERE folder_id = ?', [id]);
    await database.runAsync('DELETE FROM folders WHERE id = ?', [id]);
}

// Create a placeholder session to simple "create" a topic
export async function createTopicInFolder(topic: string, folderId: number): Promise<void> {
    const database = await getDatabase();
    const now = new Date().toISOString();
    await database.runAsync(
        'INSERT INTO sessions (topic, folder_id, start_time, end_time, duration_seconds) VALUES (?, ?, ?, ?, 0)',
        [topic, folderId, now, now]
    );
}

// Get unique topics for a folder
export async function getTopicsByFolder(folderId: number): Promise<{ topic: string; totalTime: number; sessionCount: number; lastSession: string }[]> {
    const database = await getDatabase();
    return database.getAllAsync<{ topic: string; totalTime: number; sessionCount: number; lastSession: string; color: string | null }>(
        `SELECT 
            sessions.topic,
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(CASE WHEN duration_seconds > 0 THEN 1 END) as sessionCount,
            MAX(start_time) as lastSession,
            topic_configs.color
        FROM sessions 
        LEFT JOIN topic_configs ON sessions.topic = topic_configs.topic
        WHERE folder_id = ? AND end_time IS NOT NULL
        GROUP BY sessions.topic, topic_configs.color
        ORDER BY lastSession DESC`,
        [folderId]
    );
}

// Get topics without a folder
export async function getUnfolderedTopics(): Promise<{ topic: string; totalTime: number; sessionCount: number; lastSession: string }[]> {
    const database = await getDatabase();
    return database.getAllAsync<{ topic: string; totalTime: number; sessionCount: number; lastSession: string; color: string | null }>(
        `SELECT 
            sessions.topic,
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(CASE WHEN duration_seconds > 0 THEN 1 END) as sessionCount,
            MAX(start_time) as lastSession,
            topic_configs.color
        FROM sessions 
        LEFT JOIN topic_configs ON sessions.topic = topic_configs.topic
        WHERE folder_id IS NULL AND end_time IS NOT NULL
        GROUP BY sessions.topic, topic_configs.color
        ORDER BY lastSession DESC`
    );
}

// Assign topic to folder
export async function assignTopicToFolder(topic: string, folderId: number | null): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
        'UPDATE sessions SET folder_id = ? WHERE topic = ?',
        [folderId, topic]
    );
}

// Get folder stats
export async function getFolderStats(folderId: number): Promise<{ totalTime: number; sessionCount: number; topicCount: number }> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ totalTime: number; sessionCount: number; topicCount: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COUNT(DISTINCT topic) as topicCount
        FROM sessions 
        WHERE folder_id = ? AND end_time IS NOT NULL`,
        [folderId]
    );
    return result || { totalTime: 0, sessionCount: 0, topicCount: 0 };
}

// Get topic stats
export async function getTopicStats(topic: string): Promise<{ totalTime: number; sessionCount: number; averageTime: number }> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ totalTime: number; sessionCount: number; averageTime: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COALESCE(AVG(duration_seconds), 0) as averageTime
        FROM sessions 
        WHERE topic = ? AND end_time IS NOT NULL`,
        [topic]
    );
    return result || { totalTime: 0, sessionCount: 0, averageTime: 0 };
}

// Get daily stats for a specific topic
export async function getTopicDailyStats(topic: string, days: number = 30): Promise<Map<string, number>> {
    const database = await getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await database.getAllAsync<Session>(
        `SELECT * FROM sessions 
     WHERE topic = ? AND start_time >= ? AND end_time IS NOT NULL
     ORDER BY start_time`,
        [topic, startDate.toISOString()]
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

// Get daily stats for a specific topic within a date range
export async function getTopicDailyStatsForRange(topic: string, startDate: string, endDate: string): Promise<Map<string, number>> {
    const database = await getDatabase();

    // Ensure dates are string format YYYY-MM-DD for comparison if needed, 
    // but here we rely on ISO string comparison for specific range.
    // Ideally inputs are ISO strings.

    const sessions = await database.getAllAsync<Session>(
        `SELECT * FROM sessions 
     WHERE topic = ? AND start_time >= ? AND start_time <= ? AND end_time IS NOT NULL
     ORDER BY start_time`,
        [topic, startDate, endDate]
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

export async function getFolderDailyStatsForRange(folderId: number, startDate: string, endDate: string): Promise<Map<string, number>> {
    const database = await getDatabase();

    const sessions = await database.getAllAsync<Session>(
        `SELECT * FROM sessions 
     WHERE folder_id = ? AND start_time >= ? AND start_time <= ? AND end_time IS NOT NULL
     ORDER BY start_time`,
        [folderId, startDate, endDate]
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

// Get daily stats for a specific folder
export async function getFolderDailyStats(folderId: number, days: number = 30): Promise<Map<string, number>> {
    const database = await getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await database.getAllAsync<Session>(
        `SELECT * FROM sessions 
     WHERE folder_id = ? AND start_time >= ? AND end_time IS NOT NULL
     ORDER BY start_time`,
        [folderId, startDate.toISOString()]
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

// Move topic to folder
export async function moveTopicToFolder(topic: string, folderId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
        'UPDATE sessions SET folder_id = ? WHERE topic = ?',
        [folderId, topic]
    );
}

// Get topic stats for a specific date range
export async function getTopicStatsForRange(topic: string, startDate: string, endDate: string): Promise<{ totalTime: number; sessionCount: number; averageTime: number }> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ totalTime: number; sessionCount: number; averageTime: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COALESCE(AVG(duration_seconds), 0) as averageTime
        FROM sessions 
        WHERE topic = ? AND start_time >= ? AND start_time <= ? AND end_time IS NOT NULL`,
        [topic, startDate, endDate]
    );
    return result || { totalTime: 0, sessionCount: 0, averageTime: 0 };
}

// Get folder stats for a specific date range
export async function getFolderStatsForRange(folderId: number, startDate: string, endDate: string): Promise<{ totalTime: number; sessionCount: number; topicCount: number }> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ totalTime: number; sessionCount: number; topicCount: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COUNT(DISTINCT topic) as topicCount
        FROM sessions 
        WHERE folder_id = ? AND start_time >= ? AND start_time <= ? AND end_time IS NOT NULL`,
        [folderId, startDate, endDate]
    );
    return result || { totalTime: 0, sessionCount: 0, topicCount: 0 };
}

// Get global stats for a specific date range
export async function getStatsForRange(startDate: string, endDate: string): Promise<{ totalTime: number; sessionCount: number; averageTime: number }> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ totalTime: number; sessionCount: number; averageTime: number }>(
        `SELECT 
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(*) as sessionCount,
            COALESCE(AVG(duration_seconds), 0) as averageTime
        FROM sessions 
        WHERE start_time >= ? AND start_time <= ? AND end_time IS NOT NULL`,
        [startDate, endDate]
    );
    return result || { totalTime: 0, sessionCount: 0, averageTime: 0 };
}

// ==================== APP STATE & RECOVERY ====================

export async function setAppState(key: string, value: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
        'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)',
        [key, value]
    );
}

export async function getAppState(key: string): Promise<string | null> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_state WHERE key = ?',
        [key]
    );
    return result?.value || null;
}

// ==================== TOPIC CONFIGS ====================

export async function upsertTopicConfig(topic: string, allowBackground: boolean, color?: string): Promise<void> {
    const database = await getDatabase();

    // Check existing config to preserve values if not provided
    const existing = await getTopicConfig(topic);
    const newColor = color !== undefined ? color : existing.color;

    await database.runAsync(
        'INSERT OR REPLACE INTO topic_configs (topic, allow_background, color) VALUES (?, ?, ?)',
        [topic, allowBackground ? 1 : 0, newColor || null]
    );
}

export async function getTopicConfig(topic: string): Promise<{ allowBackground: boolean; color: string | null }> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ allow_background: number; color: string | null }>(
        'SELECT allow_background, color FROM topic_configs WHERE topic = ?',
        [topic]
    );
    return { allowBackground: !!result?.allow_background, color: result?.color || null };
}

export async function recoverUnfinishedSession(): Promise<boolean> {
    const database = await getDatabase();
    // Find any session that has no end_time
    const unfinishedSession = await database.getFirstAsync<Session>(
        'SELECT * FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
    );

    if (unfinishedSession) {
        // We found a session that wasn't closed properly.
        // We will forcefully close it using the last known active timestamp if available,
        // or just close it with a reasonable fallback (e.g., +1 minute from start if completely unknown? 
        // Or better: check if we have a saved 'last_active_timestamp').

        try {
            const lastActiveStr = await getAppState('last_active_timestamp');
            let endTimeStr = new Date().toISOString();

            if (lastActiveStr) {
                // Use the last active time as the end time
                endTimeStr = new Date(parseInt(lastActiveStr)).toISOString();
            } else {
                // If no last active time, this is tricky. We might just use current time 
                // BUT that would mean the user gets "credit" for time they weren't actually in app 
                // if they just killed it.
                // However, without background fetch, we can't know when they killed it.
                // Best effort: Use a small buffer from start or simply close it at start time (0 duration)
                // to avoid cheating.
                // FOR NOW: Let's assume valid session until 'last known time'.
                // If last known time is missing, maybe default to start_time to be safe?
                endTimeStr = unfinishedSession.start_time; // 0 duration
            }

            const start = new Date(unfinishedSession.start_time).getTime();
            const end = new Date(endTimeStr).getTime();
            // Ensure non-negative
            const durationSeconds = Math.max(0, Math.floor((end - start) / 1000));

            await database.runAsync(
                'UPDATE sessions SET end_time = ?, duration_seconds = ? WHERE id = ?',
                [endTimeStr, durationSeconds, unfinishedSession.id]
            );
            return true;
        } catch (e) {
            console.error("Failed to recover session", e);
        }
    }
    return false;
}
