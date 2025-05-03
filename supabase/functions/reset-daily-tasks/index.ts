// Supabase Edge Function to reset daily tasks
// This can be deployed and scheduled to run at midnight every day

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define the request handler for the Edge Function
Deno.serve(async (req) => {
  try {
    // Get API key from environment or request headers
    const authHeader = req.headers.get('Authorization') || '';
    let apiKey = authHeader.replace('Bearer ', '');
    
    // If not provided in header, try to get from request (for testing)
    if (!apiKey && req.method === 'POST') {
      const body = await req.json();
      apiKey = body.apiKey || '';
    }
    
    // Validate the API key (you should use a secure method to store/validate this)
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get Supabase URL from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'SUPABASE_URL environment variable is not set' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, apiKey);
    
    // Run the SQL function to reset tasks
    const { data, error } = await supabase.rpc('reset_completed_actions');
    
    if (error) {
      console.error('Error resetting tasks:', error);
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily tasks have been reset', 
        timestamp: new Date().toISOString() 
      }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}); 