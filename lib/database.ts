import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';

export interface Session {
    id: number;
    topic: string;
    tags: string | null;
    start_time: string;
    end_time: string | null;
    duration_seconds: number;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;

    db = await SQLite.openDatabaseAsync('pulse.db');

    // Create sessions table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      tags TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER DEFAULT 0
    );
  `);

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
export async function createSession(topic: string, tags?: string): Promise<number> {
    const database = await getDatabase();
    const startTime = new Date().toISOString();

    const result = await database.runAsync(
        'INSERT INTO sessions (topic, tags, start_time) VALUES (?, ?, ?)',
        [topic, tags || null, startTime]
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
