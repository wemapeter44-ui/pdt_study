import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) console.error('Missing Supabase env vars. See .env.example');

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true, // This is the key fix
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // Force it to use localStorage
  },
});
