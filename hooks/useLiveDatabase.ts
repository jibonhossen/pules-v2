import { useAuth } from '@clerk/clerk-expo';
import { usePowerSyncWatchedQuery } from '@powersync/react';

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

export function useLiveSessions(days: number = 1) {
    const { userId } = useAuth();

    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startDate = new Date(today);
    // If days > 1, go back (days - 1) days. E.g., 1 day = start at today. 7 days = start at today - 6.
    if (days > 1) {
        startDate.setDate(startDate.getDate() - (days - 1));
    }

    const result = usePowerSyncWatchedQuery<Session>(
        `SELECT s.*, 
                f.name as folder_name, 
                f.color as folder_color, 
                f.icon as folder_icon,
                tc.color as topic_color
         FROM sessions s
         LEFT JOIN folders f ON s.folder_id = f.id AND (f.is_deleted = 0 OR f.is_deleted IS NULL)
         LEFT JOIN topic_configs tc ON s.topic = tc.topic AND tc.user_id = s.user_id
         WHERE s.user_id = ? 
               AND (s.is_deleted = 0 OR s.is_deleted IS NULL)
               AND s.start_time >= ? AND s.start_time <= ? 
               AND (s.duration_seconds > 0 OR s.duration_seconds IS NULL)
         ORDER BY s.start_time DESC`,
        [userId || '', startDate.toISOString(), tomorrow.toISOString()]
    );

    return result;
}

export function useLiveStats() {
    const { userId } = useAuth();

    // Total Focus Time
    const totalTimeResult = usePowerSyncWatchedQuery<{ total: number }>(
        'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE user_id = ? AND is_deleted = 0 AND end_time IS NOT NULL',
        [userId || '']
    );

    const totalFocusTime = totalTimeResult[0]?.total || 0;

    // We can't easily calculate streak purely in SQL with SQLite nicely without a recursive CTE or window functions which might be heavy
    // For now, we'll return the total time reactively. Streak might still need manual calculation or a more complex query.

    return { totalFocusTime };
}
