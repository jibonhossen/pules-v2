import { useColorScheme as useRNColorScheme } from 'react-native';
import { useCallback, useState, useEffect } from 'react';

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
        return () => {
            listeners.delete(listener);
        };
    }, []);

    const colorScheme: ColorScheme = overrideScheme ?? systemScheme ?? 'dark';

    const toggleColorScheme = useCallback(() => {
        overrideScheme = colorScheme === 'dark' ? 'light' : 'dark';
        notifyListeners();
    }, [colorScheme]);

    const setColorScheme = useCallback((scheme: ColorScheme) => {
        overrideScheme = scheme;
        notifyListeners();
    }, []);

    return {
        colorScheme,
        toggleColorScheme,
        setColorScheme,
        isDark: colorScheme === 'dark',
    };
}
