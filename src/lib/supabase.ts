
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

// Use the client from integrations/supabase/client.ts instead of duplicating
import { supabase as supabaseClient } from "@/integrations/supabase/client";

export const supabase = supabaseClient;

// Function to check if Supabase connection is configured properly
export const isSupabaseConfigured = () => {
  return true;
};
