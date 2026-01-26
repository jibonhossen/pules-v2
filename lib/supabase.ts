import { createClient } from '@supabase/supabase-js';
import type { Database } from './database-types';

// Supabase configuration for Pules
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false, // We're using Clerk for auth
    },
});

// Export config for reference
export const SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
};
