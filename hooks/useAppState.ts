import { AppState, AppStateStatus, Platform } from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook to track app state and call callbacks on state changes
 * @param onBackground - Called when app goes to background
 * @param onForeground - Called when app returns to foreground
 */
export function useAppState(
    onBackground?: () => void,
    onForeground?: () => void
) {
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
    const appStateRef = useRef(AppState.currentState);

    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        const prevState = appStateRef.current;

        // App came to foreground
        if (
            (prevState === 'inactive' || prevState === 'background') &&
            nextAppState === 'active'
        ) {
            onForeground?.();
        }

        // App went to background
        if (
            prevState === 'active' &&
            (nextAppState === 'inactive' || nextAppState === 'background')
        ) {
            onBackground?.();
        }

        appStateRef.current = nextAppState;
        setAppState(nextAppState);
    }, [onBackground, onForeground]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [handleAppStateChange]);

    return {
        appState,
        isActive: appState === 'active',
        isBackground: appState === 'background',
        isInactive: appState === 'inactive',
    };
}
