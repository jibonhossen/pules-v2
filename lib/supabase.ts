import { createClient } from '@supabase/supabase-js';
import type { Database } from './database-types';

// Supabase configuration for Pules
const SUPABASE_URL = 'https://ljuqkopwkybrtynflilh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdXFrb3B3a3licnR5bmZsaWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzI0NTQsImV4cCI6MjA4NDkwODQ1NH0.X69AB_LEU4xFHZay84nXbpdcK8V7My74ZtsCPu0FL3U';

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
