import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Preloads the browser for Android devices to reduce authentication load time
 * See: https://docs.expo.dev/guides/authentication/#improving-user-experience
 */
export function useWarmUpBrowser() {
    useEffect(() => {
        if (Platform.OS !== 'android') return;

        void WebBrowser.warmUpAsync().catch((err) => {
            console.log('Failed to warm up browser:', err);
        });

        return () => {
            // Cleanup: closes browser when component unmounts
            void WebBrowser.coolDownAsync().catch((err) => {
                // Ignore this error, it happens if the activity is already destroyed
                console.log('Failed to cool down browser:', err);
            });
        };
    }, []);
}
