
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

// Use direct values from our Supabase connection instead of environment variables
export const supabase = createClient<Database>(
  "https://haekhglsuyrfiyrkssfe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZWtoZ2xzdXlyZml5cmtzc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQxODYsImV4cCI6MjA2MTA3MDE4Nn0.lgaCHeen3UQrCWFTK2rA_Dd1pWQFoRabVKjXmchr__U"
);

// Function to check if Supabase connection is configured properly
export const isSupabaseConfigured = () => {
  return true; // We're now using direct values so this is always true
};
