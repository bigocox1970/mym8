
// Re-export the singleton Supabase client
export { supabase } from './supabaseClient';

// Function to check if Supabase connection is configured properly
export const isSupabaseConfigured = () => {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
  return Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY);
};
