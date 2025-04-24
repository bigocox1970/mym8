// A simple script to test querying the activity_logs table directly
// Run with: node src/test-logs.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://haekhglsuyrfiyrkssfe.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZWtoZ2xzdXlyZml5cmtzc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY1ODAyNDMsImV4cCI6MjAzMjE1NjI0M30.jFhYnwRk5fYgBMLUz60QOlIFcOUC0RrZQ7fVIkLwDq8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // First, check if the table exists using pg_get_ddl
    console.log('Checking table structure...');
    const { data: tableData, error: tableError } = await supabase
      .rpc('pg_get_ddl', { table: 'activity_logs', schema: 'public', options: 'column,complex' })
      .single();
    
    if (tableError) {
      if (tableError.message.includes('relation "activity_logs" does not exist')) {
        console.error('The activity_logs table does not exist.');
        console.log('Need to run the migration script: supabase/migrations/20250502000000_fix_activity_logs.sql');
      } else {
        console.error('Error checking table structure:', tableError);
      }
      return;
    }
    
    console.log('Table structure:\n', tableData);
    
    // Try to query the activity_logs table
    console.log('\nAttempting to query the activity_logs table...');
    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error querying activity_logs:', error);
      return;
    }
    
    console.log(`Found ${logs.length} logs:`);
    console.log(JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Unhandled error:', error);
  }
}

main(); 