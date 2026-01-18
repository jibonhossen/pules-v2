import { create } from 'zustand';
import {
    createSession,
    endSession,
    getAllSessions,
    getTodaySessions,
    getTotalFocusTime,
    getCurrentStreak,
    type Session,
} from '@/lib/database';

interface TimerState {
    // Timer state
    isRunning: boolean;
    isPaused: boolean;
    elapsedSeconds: number;
    currentSessionId: number | null;
    currentTopic: string;

    // Session data
    sessions: Session[];
    todaySessions: Session[];
    totalFocusTime: number;
    currentStreak: number;

    // Timer actions
    startTimer: (topic: string) => Promise<void>;
    pauseTimer: () => void;
    resumeTimer: () => void;
    stopTimer: () => Promise<void>;
    tick: () => void;
    resetTimer: () => void;

    // Data actions
    loadSessions: () => Promise<void>;
    loadStats: () => Promise<void>;
}

export const useSessionStore = create<TimerState>((set, get) => ({
    // Initial state
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    currentSessionId: null,
    currentTopic: '',
    sessions: [],
    todaySessions: [],
    totalFocusTime: 0,
    currentStreak: 0,

    startTimer: async (topic: string) => {
        const sessionId = await createSession(topic);
        set({
            isRunning: true,
            isPaused: false,
            currentSessionId: sessionId,
            currentTopic: topic,
            elapsedSeconds: 0,
        });
    },

    pauseTimer: () => {
        set({ isPaused: true });
    },

    resumeTimer: () => {
        set({ isPaused: false });
    },

    stopTimer: async () => {
        const { currentSessionId } = get();
        if (currentSessionId) {
            await endSession(currentSessionId);
        }
        set({
            isRunning: false,
            isPaused: false,
            currentSessionId: null,
            currentTopic: '',
            elapsedSeconds: 0,
        });
        // Refresh data
        get().loadSessions();
        get().loadStats();
    },

    tick: () => {
        const { isRunning, isPaused } = get();
        if (isRunning && !isPaused) {
            set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
        }
    },

    resetTimer: () => {
        set({
            isRunning: false,
            isPaused: false,
            currentSessionId: null,
            currentTopic: '',
            elapsedSeconds: 0,
        });
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
