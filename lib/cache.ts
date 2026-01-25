import * as SecureStore from 'expo-secure-store';

export const tokenCache = {
    async getToken(key: string) {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (err) {
            return null;
        }
    },
    async saveToken(key: string, value: string) {
        try {
            return SecureStore.setItemAsync(key, value);
        } catch (err) {
            return;
        }
    },
};

const USER_ID_KEY = 'last_user_id';

export async function saveLastUserId(userId: string) {
    try {
        await SecureStore.setItemAsync(USER_ID_KEY, userId);
    } catch (e) {
        console.warn('Failed to save user ID locally');
    }
}

export async function getLastUserId() {
    try {
        return await SecureStore.getItemAsync(USER_ID_KEY);
    } catch (e) {
        return null;
    }
}

export async function clearLastUserId() {
    try {
        await SecureStore.deleteItemAsync(USER_ID_KEY);
    } catch (e) {
        // Ignore
    }
}
