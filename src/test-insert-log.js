// A simple script to test inserting into the activity_logs table directly
// Run with: node src/test-insert-log.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'https://haekhglsuyrfiyrkssfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZWtoZ2xzdXlyZml5cmtzc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUwMDA1NzYsImV4cCI6MjAzMDU3NjU3Nn0.R1gBbQ2zbZLDkZCVuXwTzKANJtZmTcFBPsOKYZRaeSk';

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Replace these with your actual test values
const userId = '75ec432f-95f8-4ce0-9f45-546354f1f075'; // Your actual user ID
const taskId = 'ad07225c-a31f-4186-87bf-950a317b50f4'; // ID of an existing task

async function testInsertLog() {
  // Try to insert a test record
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      task_id: taskId,
      completed: true,
      timestamp: new Date().toISOString()
    });

  if (error) {
    console.error('Error inserting test log:', error);
  } else {
    console.log('Test log inserted successfully:', data);
  }
}

// Execute the function
testInsertLog()
  .catch(console.error); 