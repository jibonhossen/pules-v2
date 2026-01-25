
import { NAV_THEME, PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PowerSyncProvider } from '@/lib/powersync/PowerSyncProvider';
import { useSessionStore } from '@/store/sessions';
import { ClerkLoaded, ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

export {
  ErrorBoundary
} from 'expo-router';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function LoadingScreen() {
  const { colorScheme } = useColorScheme();
  const colors = PULSE_COLORS[colorScheme ?? 'dark'];

  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

// Component to handle auth-based routing
function InitialLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const setUserId = useSessionStore((state) => state.setUserId);

  // Sync user ID to session store - PowerSync handles cloud sync automatically
  React.useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    } else {
      setUserId(null);
    }
  }, [user?.id, setUserId]);

  React.useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isSignedIn && inAuthGroup) {
      // User is signed in but on auth screen, redirect to home
      router.replace('/(tabs)');
    } else if (!isSignedIn && !inAuthGroup) {
      // User is not signed in and not on auth screen, redirect to sign-in
      router.replace('/(auth)/sign-in');
    }
  }, [isSignedIn, isLoaded, segments]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="analytics/folder/[id]" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="analytics/topic/[topic]" options={{ presentation: 'card', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Show loading while fonts load - PowerSync init is handled by PowerSyncProvider
  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'dark']}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <LoadingScreen />
        </ThemeProvider>
      </GestureHandlerRootView>
    );
  }

  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env');
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <PowerSyncProvider>
          <GestureHandlerRootView style={styles.root}>
            <ThemeProvider value={NAV_THEME[colorScheme ?? 'dark']}>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              <InitialLayout />
            </ThemeProvider>
          </GestureHandlerRootView>
        </PowerSyncProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
