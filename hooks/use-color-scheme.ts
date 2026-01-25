import { useColorScheme as useRNColorScheme } from 'react-native';
import { useCallback, useState, useEffect } from 'react';
import { getAppState, setAppState } from '@/lib/database';

type ColorScheme = 'light' | 'dark';

// Simple in-memory override for color scheme
let overrideScheme: ColorScheme | null = null;
const listeners: Set<() => void> = new Set();

function notifyListeners() {
    listeners.forEach((listener) => listener());
}

export function useColorScheme() {
    const systemScheme = useRNColorScheme();
    const [, forceUpdate] = useState({});

    useEffect(() => {
        const listener = () => forceUpdate({});
        listeners.add(listener);

        // Load saved theme
        const loadTheme = async () => {
            try {
                const saved = await getAppState('theme_preference');
                if (saved === 'light' || saved === 'dark') {
                    if (overrideScheme !== saved) {
                        overrideScheme = saved;
                        notifyListeners();
                    }
                }
            } catch (e) {
                // Ignore error (DB might not be ready yet, or first run)
                console.log('Failed to load theme preference', e);
            }
        };

        loadTheme();

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const colorScheme: ColorScheme = overrideScheme ?? systemScheme ?? 'dark';

    const toggleColorScheme = useCallback(() => {
        const newScheme = colorScheme === 'dark' ? 'light' : 'dark';
        overrideScheme = newScheme;
        notifyListeners();
        setAppState('theme_preference', newScheme).catch((e) => console.error('Failed to save theme', e));
    }, [colorScheme]);

    const setColorScheme = useCallback((scheme: ColorScheme) => {
        overrideScheme = scheme;
        notifyListeners();
        setAppState('theme_preference', scheme).catch((e) => console.error('Failed to save theme', e));
    }, []);

    return {
        colorScheme,
        toggleColorScheme,
        setColorScheme,
        isDark: colorScheme === 'dark',
    };
}
