Here is a `README.md` file you can include in your project documentation or pull request. It outlines exactly why we made these changes and how they work.

```markdown
# Offline Optimization: Clerk & PowerSync

## The Problem
We noticed the app was loading significantly slower in offline mode compared to online mode.

**Root Cause:**
The app was waiting for Clerk to verify the user session with the server before rendering any content. In offline mode, this caused a delay while the network request timed out. Since we use PowerSync (a local-first database), we actually have the data ready on the device immediately and shouldn't need to wait for the network.

## The Solution
We moved from an "Online-First" auth strategy to a "Local-First" strategy. We now persist the authentication token on the device using `expo-secure-store`. This allows Clerk to verify the session locally and load the app instantly, even without an internet connection.

## Implementation Steps

### 1. Install Dependencies
We need Secure Store to encrypt and save the session token on the device.

```bash
npx expo install expo-secure-store

```

### 2. Create the Token Cache

We created a helper file `utils/cache.ts` (or wherever your utils live) to handle the storage logic.

```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';

const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        const item = await SecureStore.getItemAsync(key);
        return item;
      } catch (error) {
        // If there is an error reading the token, clear it to prevent loops
        await SecureStore.deleteItemAsync(key);
        return null;
      }
    },
    saveToken: (key: string, token: string) => {
      return SecureStore.setItemAsync(key, token);
    },
  };
};

// SecureStore is not available on web, so we only use it for native
export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;

```

### 3. Update Clerk Provider

In `app/_layout.tsx`, we updated the provider to use the new cache and enabled the experimental resource cache for faster bootstrapping.

```tsx
<ClerkProvider 
  publishableKey={CLERK_KEY}
  tokenCache={tokenCache}
  __experimental_resourceCache={true}
>
  <Slot />
</ClerkProvider>

```

## Important Considerations

### Security

* **Encryption:** We use `expo-secure-store` which uses the Keychain Services on iOS and Shared Preferences (encrypted) on Android. This is much safer than `AsyncStorage` for sensitive auth tokens.

### Data Sync Strategy

* **Optimistic Rendering:** The UI is now decoupled from the network status. It will render data from the local SQLite (PowerSync) database immediately.
* **Background Sync:** When the app detects a network connection later, PowerSync will automatically push pending changes to Supabase and Clerk will refresh the session in the background.

### Edge Case: Token Expiration

If a user stays offline for a very long time (weeks), their local token might expire. In this case, Clerk will prompt for a login when they eventually reconnect to the internet. We should ensure our error boundaries handle this gracefully by redirecting to the sign-in screen if a "Unauthorized" error occurs during a sync.

```

**Next Step:** Would you like me to create the error boundary component mentioned in the "Edge Case" section to handle token expiration gracefully?

```