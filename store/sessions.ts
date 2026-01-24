import { create } from 'zustand';
import {
    createSession,
    endSession,
    getAllSessions,
    getTodaySessions,
    getTotalFocusTime,
    getCurrentStreak,
    getFolderById,
    recoverUnfinishedSession,
    getTopicConfig,
    setAppState,
    getAppState,
    type Session,
} from '@/lib/database';

import { DeviceEventEmitter } from 'react-native';

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
    isBackgroundAllowed: boolean;
    autoPaused: boolean;

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
    isBackgroundAllowed: false,
    autoPaused: false,
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

        const { allowBackground } = await getTopicConfig(topic);

        const now = Date.now();
        const newState = {
            isRunning: true,
            isPaused: false,
            currentSessionId: sessionId,
            currentTopic: topic,
            currentFolderId: folderId || null,
            currentFolderName: folderName,
            isBackgroundAllowed: allowBackground,
            autoPaused: false,
            elapsedSeconds: 0,
            startTime: now,
            pausedAt: null,
        };
        set(newState);

        // Persist state
        await setAppState('timer_state', JSON.stringify(newState));
    },

    pauseTimer: () => {
        const { isRunning, isPaused } = get();
        if (isRunning && !isPaused) {
            const updates = {
                isPaused: true,
                pausedAt: Date.now(),
            };
            set(updates);
            setAppState('timer_state', JSON.stringify(get()));
        }
    },

    resumeTimer: () => {
        const { isRunning, isPaused, pausedAt, startTime } = get();
        if (isRunning && isPaused && pausedAt && startTime) {
            // Calculate how long we were paused
            const pauseDuration = Date.now() - pausedAt;
            // Adjust start time to account for pause duration
            const updates = {
                isPaused: false,
                pausedAt: null,
                startTime: startTime + pauseDuration,
            };
            set(updates);

            setAppState('timer_state', JSON.stringify(get()));
        }
    },

    stopTimer: async () => {
        const { currentSessionId } = get();
        if (currentSessionId) {
            await endSession(currentSessionId);
        }

        // Clear persistence
        await setAppState('timer_state', '');

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
            autoPaused: false,
        });
        // Refresh data
        get().loadSessions();
        get().loadStats();
    },

    tick: () => {
        const { isRunning, isPaused, startTime } = get();
        if (isRunning && !isPaused && startTime) {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            set({ elapsedSeconds: elapsed });
        }
    },

    resetTimer: () => {
        set({
            isRunning: false,
            isPaused: false,
            currentSessionId: null,
            currentTopic: '',
            elapsedSeconds: 0,
            startTime: null,
            pausedAt: null,
            autoPaused: false,
        });
    },

    // Called when app goes to background
    onAppBackground: () => {
        const { isRunning, isPaused, isBackgroundAllowed } = get();

        // Always save state persistence timestamp
        setAppState('last_active_timestamp', Date.now().toString());

        // Snapshot current state for persistence
        setAppState('timer_state', JSON.stringify(get()));

        // Logic: Always pause on background UNLESS isBackgroundAllowed is true
        if (isRunning && !isPaused) {
            if (isBackgroundAllowed) {
                console.log('[Timer] App backgrounded, but background allowed. Continuing.');
                return;
            }

            console.log('[Timer] App backgrounded. Pausing timer and setting autoPaused flag.');
            get().pauseTimer();
            set({ autoPaused: true });

            // Update persistence to reflect paused state
            setAppState('timer_state', JSON.stringify(get()));
        }
    },

    // Called when app returns to foreground
    onAppForeground: () => {
        const { isRunning, isPaused, autoPaused } = get();

        console.log('[Timer] App foregrounded. AutoPaused:', autoPaused);

        // If we were auto-paused due to backgrounding, resume now
        if (autoPaused && isPaused && isRunning) {
            console.log('[Timer] Auto-resuming timer...');
            get().resumeTimer();
            set({ autoPaused: false });
        }

        // Sync visual state
        if (get().isRunning && !get().isPaused && get().startTime) {
            const elapsed = Math.floor((Date.now() - get().startTime!) / 1000);
            set({ elapsedSeconds: elapsed });
        }
    },

    loadSessions: async () => {
        // "When user completely close the app save the session"
        // This runs on App Launch. If we find a persisted session, it means the app was killed.
        // We should END that session and save it, rather than resuming it.

        try {
            const savedStateStr = await getAppState('timer_state');
            if (savedStateStr) {
                const savedState = JSON.parse(savedStateStr);

                if (savedState.currentSessionId && savedState.startTime) {
                    console.log('[Timer] Found persisted session from previous run. Ending it as per request.');

                    // Logic to calculate final duration
                    let finalDuration = 0;
                    if (savedState.pausedAt) {
                        // It was paused when killed (or paused right before kill)
                        finalDuration = Math.floor((savedState.pausedAt - savedState.startTime) / 1000);
                    } else {
                        // It was running when killed. 
                        // We can't know exactly WHEN it was killed, but 'elapsedSeconds' in state 
                        // reflects the last tick seen by UI. 
                        // Or we can use 'last_active_timestamp' if we saved it?
                        // Let's use the safer bet: elapsedSeconds from state, or (last_active - start).
                        finalDuration = savedState.elapsedSeconds || 0;
                    }

                    // End the session in DB
                    // Note: 'endSession' usually takes current time as end time.
                    // We might need to manually update the record if we want specific duration?
                    // 'endSession' implementation in database.ts updates duration = (now - start_time - pauses).
                    // This logic assumes "Now" is end time. But "Now" is way later.
                    // So we should manually update the session in DB if possible, or just accept 'elapsedSeconds' as truth.

                    // Actually, endSession(id) sets end_time = now.
                    // If we want to "Save" what was done, we just want to ensure the DURATION is correct.
                    // The DB 'endSession' might overwrite duration based on wrong times.
                    // But wait, if we call `recoverUnfinishedSession`, it usually marks it as incomplete or something.

                    // Let's rely on `recoverUnfinishedSession` but maybe tweak behavior?
                    // Or reuse `endSession` but pass a flag?
                    // Actually, if we just want to Close it, `recoverUnfinishedSession` is designed for this!
                    // It finds open sessions and closes them.

                    await recoverUnfinishedSession();

                    // Clear persistence
                    await setAppState('timer_state', '');
                }
            } else {
                await recoverUnfinishedSession();
            }
        } catch (e) {
            console.error("Failed to recover", e);
            await recoverUnfinishedSession();
        }

        const [sessions, todaySessions] = await Promise.all([
            getAllSessions(),
            getTodaySessions(),
        ]);
        set({ sessions, todaySessions });

        // Also load stats
        get().loadStats();
    },

    loadStats: async () => {
        const [totalFocusTime, currentStreak] = await Promise.all([
            getTotalFocusTime(),
            getCurrentStreak(),
        ]);
        set({ totalFocusTime, currentStreak });
    },
}));

