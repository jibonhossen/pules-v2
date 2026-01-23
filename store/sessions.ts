import { create } from 'zustand';
import {
    createSession,
    endSession,
    getAllSessions,
    getTodaySessions,
    getTotalFocusTime,
    getCurrentStreak,
    getFolderById,
    type Session,
} from '@/lib/database';
import { notificationService } from '@/lib/NotificationService';

interface TimerState {
    // Timer state
    isRunning: boolean;
    isPaused: boolean;
    elapsedSeconds: number;
    startTime: number | null; // Unix timestamp when timer started (for accurate recovery)
    pausedAt: number | null;  // Timestamp when paused (for calculating elapsed while paused)
    currentSessionId: number | null;
    currentTopic: string;
    currentFolderId: number | null;
    currentFolderName: string;

    // Session data
    sessions: Session[];
    todaySessions: Session[];
    totalFocusTime: number;
    currentStreak: number;

    // Timer actions
    startTimer: (topic: string, folderId?: number) => Promise<void>;
    pauseTimer: () => void;
    resumeTimer: () => void;
    stopTimer: () => Promise<void>;
    tick: () => void;
    resetTimer: () => void;

    // App state actions
    onAppBackground: () => void;
    onAppForeground: () => void;

    // Data actions
    loadSessions: () => Promise<void>;
    loadStats: () => Promise<void>;
}

export const useSessionStore = create<TimerState>((set, get) => ({
    // Initial state
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    startTime: null,
    pausedAt: null,
    currentSessionId: null,
    currentTopic: '',
    currentFolderId: null,
    currentFolderName: '',
    sessions: [],
    todaySessions: [],
    totalFocusTime: 0,
    currentStreak: 0,

    startTimer: async (topic: string, folderId?: number) => {
        const sessionId = await createSession(topic, undefined, folderId);
        let folderName = '';
        if (folderId) {
            const folder = await getFolderById(folderId);
            folderName = folder?.name || '';
        }

        const now = Date.now();
        set({
            isRunning: true,
            isPaused: false,
            currentSessionId: sessionId,
            currentTopic: topic,
            currentFolderId: folderId || null,
            currentFolderName: folderName,
            elapsedSeconds: 0,
            startTime: now,
            pausedAt: null,
        });

        // Show notification
        await notificationService.showTimerNotification(topic, 0);
    },

    pauseTimer: () => {
        const { isRunning, isPaused, elapsedSeconds } = get();
        if (isRunning && !isPaused) {
            set({
                isPaused: true,
                pausedAt: Date.now(),
            });
        }
    },

    resumeTimer: () => {
        const { isRunning, isPaused, pausedAt, startTime, elapsedSeconds, currentTopic } = get();
        if (isRunning && isPaused && pausedAt && startTime) {
            // Calculate how long we were paused
            const pauseDuration = Date.now() - pausedAt;
            // Adjust start time to account for pause duration
            set({
                isPaused: false,
                pausedAt: null,
                startTime: startTime + pauseDuration,
            });

            // Resume notification
            notificationService.showTimerNotification(currentTopic, elapsedSeconds);
        }
    },

    stopTimer: async () => {
        const { currentSessionId } = get();
        if (currentSessionId) {
            await endSession(currentSessionId);
        }

        // Hide notification
        await notificationService.hideTimerNotification();

        set({
            isRunning: false,
            isPaused: false,
            currentSessionId: null,
            currentTopic: '',
            currentFolderId: null,
            currentFolderName: '',
            elapsedSeconds: 0,
            startTime: null,
            pausedAt: null,
        });
        // Refresh data
        get().loadSessions();
        get().loadStats();
    },

    tick: () => {
        const { isRunning, isPaused, startTime, currentTopic } = get();
        if (isRunning && !isPaused && startTime) {
            // Calculate elapsed based on start time for accuracy
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            set({ elapsedSeconds: elapsed });

            // Update notification
            notificationService.updateTimerNotification(elapsed);
        }
    },

    resetTimer: () => {
        notificationService.hideTimerNotification();
        set({
            isRunning: false,
            isPaused: false,
            currentSessionId: null,
            currentTopic: '',
            elapsedSeconds: 0,
            startTime: null,
            pausedAt: null,
        });
    },

    // Called when app goes to background
    onAppBackground: () => {
        const { isRunning, isPaused } = get();
        if (isRunning && !isPaused) {
            // Pause the timer when app goes to background
            set({
                isPaused: true,
                pausedAt: Date.now(),
            });
        }
    },

    // Called when app returns to foreground
    onAppForeground: () => {
        const { isRunning, isPaused, pausedAt, startTime, currentTopic, elapsedSeconds } = get();
        if (isRunning && isPaused && pausedAt && startTime) {
            // Calculate pause duration and adjust
            const pauseDuration = Date.now() - pausedAt;
            set({
                isPaused: false,
                pausedAt: null,
                startTime: startTime + pauseDuration,
            });

            // Resume notification
            notificationService.showTimerNotification(currentTopic, elapsedSeconds);
        }
    },

    loadSessions: async () => {
        const [sessions, todaySessions] = await Promise.all([
            getAllSessions(),
            getTodaySessions(),
        ]);
        set({ sessions, todaySessions });
    },

    loadStats: async () => {
        const [totalFocusTime, currentStreak] = await Promise.all([
            getTotalFocusTime(),
            getCurrentStreak(),
        ]);
        set({ totalFocusTime, currentStreak });
    },
}));
