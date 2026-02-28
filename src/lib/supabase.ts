import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase is optional — when env vars are missing, the app runs in mock mode.
 * All API modules check `isSupabaseConfigured()` before querying.
 */
export const supabase: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

export function isSupabaseConfigured(): boolean {
    return supabase !== null;
}
