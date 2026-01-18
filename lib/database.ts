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
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;

    db = await SQLite.openDatabaseAsync('pulse.db');

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
  `);

    // Try to add folder_id column if it doesn't exist (for existing databases)
    try {
        await db.execAsync(`ALTER TABLE sessions ADD COLUMN folder_id INTEGER REFERENCES folders(id);`);
    } catch (e) {
        // Column already exists, ignore
    }

    return db;
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
        'SELECT * FROM sessions ORDER BY start_time DESC'
    );
}

export async function getSessionsByDateRange(
    startDate: string,
    endDate: string
): Promise<Session[]> {
    const database = await getDatabase();
    return database.getAllAsync<Session>(
        `SELECT * FROM sessions 
     WHERE start_time >= ? AND start_time <= ? 
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
        const date = session.start_time.split('T')[0];
        const current = dailyMap.get(date) || 0;
        dailyMap.set(date, current + (session.duration_seconds || 0));
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
        const dateStr = date.toISOString().split('T')[0];

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
        'SELECT * FROM sessions WHERE topic = ? ORDER BY start_time DESC',
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
    return database.getAllAsync<{ topic: string; totalTime: number; sessionCount: number; lastSession: string }>(
        `SELECT 
            topic,
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(CASE WHEN duration_seconds > 0 THEN 1 END) as sessionCount,
            MAX(start_time) as lastSession
        FROM sessions 
        WHERE folder_id = ? AND end_time IS NOT NULL
        GROUP BY topic
        ORDER BY lastSession DESC`,
        [folderId]
    );
}

// Get topics without a folder
export async function getUnfolderedTopics(): Promise<{ topic: string; totalTime: number; sessionCount: number; lastSession: string }[]> {
    const database = await getDatabase();
    return database.getAllAsync<{ topic: string; totalTime: number; sessionCount: number; lastSession: string }>(
        `SELECT 
            topic,
            COALESCE(SUM(duration_seconds), 0) as totalTime,
            COUNT(CASE WHEN duration_seconds > 0 THEN 1 END) as sessionCount,
            MAX(start_time) as lastSession
        FROM sessions 
        WHERE folder_id IS NULL AND end_time IS NOT NULL
        GROUP BY topic
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
        const date = session.start_time.split('T')[0];
        const current = dailyMap.get(date) || 0;
        dailyMap.set(date, current + (session.duration_seconds || 0));
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
        const date = session.start_time.split('T')[0];
        const current = dailyMap.get(date) || 0;
        dailyMap.set(date, current + (session.duration_seconds || 0));
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
