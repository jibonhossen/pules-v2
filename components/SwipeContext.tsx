import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Keyboard } from 'react-native';

interface SwipeContextType {
    registerOpenItem: (id: string, closeFn: () => void) => void;
    closeCurrent: () => void;
}

const SwipeContext = createContext<SwipeContextType | null>(null);

export function SwipeProvider({ children }: { children: React.ReactNode }) {
    const currentOpenId = useRef<string | null>(null);
    const currentCloseFn = useRef<(() => void) | null>(null);

    const closeCurrent = useCallback(() => {
        if (currentCloseFn.current) {
            currentCloseFn.current();
            currentCloseFn.current = null;
            currentOpenId.current = null;
        }
    }, []);

    const registerOpenItem = useCallback((id: string, closeFn: () => void) => {
        if (currentOpenId.current && currentOpenId.current !== id) {
            if (currentCloseFn.current) {
                currentCloseFn.current();
            }
        }
        currentOpenId.current = id;
        currentCloseFn.current = closeFn;
    }, []);

    return (
        <SwipeContext.Provider value={{ registerOpenItem, closeCurrent }}>
            {children}
        </SwipeContext.Provider>
    );
}

export function useSwipeContext() {
    return useContext(SwipeContext);
}
