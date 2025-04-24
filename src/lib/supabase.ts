
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

// Check if environment variables are available
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  console.error("Missing VITE_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_ANON_KEY environment variable");
}

// Create supabase client
export const supabase = createClient<Database>(
  supabaseUrl || 'https://your-project-url.supabase.co', 
  supabaseAnonKey || 'your-anon-key'
);

// Function to check if Supabase connection is configured properly
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};
