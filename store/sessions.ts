import {
    createSession,
    endSession,
    getAllSessions,
    getAppState,
    getCurrentStreak,
    getFolderById,
    getTodaySessions,
    getTopicConfig,
    getTotalFocusTime,
    recoverUnfinishedSession,
    setAppState,
    setCurrentUserId,
    upsertTopicConfig,
    type Session,
} from '@/lib/database';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { create } from 'zustand';


interface TimerState {
    // Timer state
    isRunning: boolean;
    isPaused: boolean;
    elapsedSeconds: number;
    startTime: number | null; // Unix timestamp when timer started
    pausedAt: number | null;  // Timestamp when paused
    currentSessionId: string | null; // Changed to string for UUID
    currentTopic: string;
    currentFolderId: string | null; // Changed to string for UUID
    currentFolderName: string;
    isBackgroundAllowed: boolean;
    autoPaused: boolean;
    userId: string | null;

    // Session data
    sessions: Session[];
    todaySessions: Session[];
    totalFocusTime: number;
    currentStreak: number;

    // Timer actions
    startTimer: (topic: string, folderId?: string) => Promise<void>;
    pauseTimer: () => Promise<void>;
    resumeTimer: () => Promise<void>;
    stopTimer: () => Promise<void>;
    tick: () => void;
    resetTimer: () => Promise<void>;

    // App state actions
    onAppBackground: () => void;
    onAppForeground: () => void;

    // Data actions
    loadSessions: () => Promise<void>;
    loadStats: () => Promise<void>;
    updateTopicColor: (topic: string, color: string) => Promise<void>;
    setUserId: (userId: string | null) => void;
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
    userId: null,
    sessions: [],
    todaySessions: [],
    totalFocusTime: 0,
    currentStreak: 0,

    startTimer: async (topic: string, folderId?: string) => {
        // If a timer is already running, stop it first to save the session
        const currentState = get();
        if (currentState.isRunning && currentState.currentSessionId) {
            await get().stopTimer();
        }

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

        // Keep screen awake
        await activateKeepAwakeAsync();
    },

    pauseTimer: async () => {
        const { isRunning, isPaused } = get();
        if (isRunning && !isPaused) {
            const updates = {
                isPaused: true,
                pausedAt: Date.now(),
            };
            set(updates);
            setAppState('timer_state', JSON.stringify(get()));
            await deactivateKeepAwake();
        }
    },

    resumeTimer: async () => {
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
            await activateKeepAwakeAsync();
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
        await deactivateKeepAwake();

        // Refresh data - PowerSync handles sync automatically
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

    resetTimer: async () => {
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
        await deactivateKeepAwake();
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
        const { userId } = get();
        // Skip if user is not authenticated yet
        if (!userId) {
            console.log('[Timer] Skipping loadSessions - user not authenticated');
            return;
        }

        try {
            const savedStateStr = await getAppState('timer_state');
            if (savedStateStr) {
                const savedState = JSON.parse(savedStateStr);

                if (savedState.currentSessionId && savedState.startTime) {
                    console.log('[Timer] Found persisted session from previous run. Ending it.');
                    await recoverUnfinishedSession();
                    await setAppState('timer_state', '');
                }
            } else {
                await recoverUnfinishedSession();
            }
        } catch (e) {
            console.error("Failed to recover", e);
            try {
                await recoverUnfinishedSession();
            } catch (innerE) {
                console.error("Failed to recover (retry)", innerE);
            }
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
        const { userId } = get();
        // Skip if user is not authenticated yet
        if (!userId) {
            console.log('[Timer] Skipping loadStats - user not authenticated');
            return;
        }

        const [totalFocusTime, currentStreak] = await Promise.all([
            getTotalFocusTime(),
            getCurrentStreak(),
        ]);
        set({ totalFocusTime, currentStreak });
    },

    updateTopicColor: async (topic: string, color: string) => {
        const { allowBackground } = await getTopicConfig(topic);
        await upsertTopicConfig(topic, allowBackground, color);
        // Refresh sessions to update colors
        get().loadSessions();
    },

    setUserId: (userId: string | null) => {
        set({ userId });
        // Update the database layer with current user ID
        setCurrentUserId(userId);
    },
}));
