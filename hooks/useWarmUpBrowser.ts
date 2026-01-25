import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * Preloads the browser for Android devices to reduce authentication load time
 * See: https://docs.expo.dev/guides/authentication/#improving-user-experience
 */
export function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void WebBrowser.warmUpAsync();

    return () => {
      // Cleanup: closes browser when component unmounts
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
