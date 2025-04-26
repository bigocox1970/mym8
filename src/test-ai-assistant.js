/**
 * Test script for AI Assistant functionality
 * 
 * This script tests if the AI assistant can:
 * 1. Create a goal
 * 2. Add an action
 * 3. Mark an action as complete
 * 
 * Run this script with: node src/test-ai-assistant.js
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: '.env.development' });

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);
const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// API URL
const API_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8888/.netlify/functions/api';

// Test user ID (we'll create a test user if needed)
let testUserId;

// Test data
const testGoal = {
  goalText: "Test Goal from AI Assistant",
  description: "This is a test goal created by the AI assistant test script"
};

const testAction = {
  title: "Test Action from AI Assistant",
  description: "This is a test action created by the AI assistant test script",
  frequency: "daily"
};

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Starting AI Assistant functionality tests...');
  
  try {
    // Step 1: Get or create a test user
    testUserId = await getOrCreateTestUser();
    console.log(`✅ Using test user ID: ${testUserId}`);
    
    // Step 2: Test creating a goal
    const goal = await testCreateGoal();
    console.log(`✅ Successfully created goal with ID: ${goal.goalId}`);
    
    // Step 3: Test adding an action
    const action = await testAddAction(goal.goalId);
    console.log(`✅ Successfully added action with ID: ${action.actionId}`);
    
    // Step 4: Test marking an action as complete
    const completedAction = await testCompleteAction(action.actionId);
    console.log(`✅ Successfully marked action as complete: ${completedAction.message}`);
    
    console.log('\n🎉 All tests passed! The AI assistant functionality is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

/**
 * Get or create a test user
 */
async function getOrCreateTestUser() {
  try {
    // First try to get an existing user
    const { data: users, error } = await adminSupabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    if (users && users.length > 0) {
      return users[0].id;
    }
    
    // If no users exist, try to get a user ID from goals
    const { data: goals, error: goalsError } = await adminSupabase
      .from('goals')
      .select('user_id')
      .limit(1);
    
    if (!goalsError && goals && goals.length > 0) {
      return goals[0].user_id;
    }
    
    // If still no user ID, create a test user
    const testEmail = `test-${uuidv4()}@example.com`;
    const testPassword = uuidv4();
    
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (authError) throw authError;
    
    return authData.user.id;
  } catch (error) {
    console.error('Error getting or creating test user:', error);
    throw new Error('Failed to get or create test user');
  }
}

/**
 * Test creating a goal
 */
async function testCreateGoal() {
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Create a goal called "${testGoal.goalText}" with description "${testGoal.description}"`,
        userId: testUserId,
        goals: [],
        actions: [],
        conversation: []
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Create goal response:', data);
    
    // Check if the goal was created by querying the database
    const { data: goals, error } = await adminSupabase
      .from('goals')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    if (!goals || goals.length === 0) {
      throw new Error('Goal was not created in the database');
    }
    
    return { goalId: goals[0].id, goal: goals[0] };
  } catch (error) {
    console.error('Error testing goal creation:', error);
    throw new Error('Failed to create goal');
  }
}

/**
 * Test adding an action
 */
async function testAddAction(goalId) {
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add an action called "${testAction.title}" with description "${testAction.description}" and frequency "${testAction.frequency}" to my goal`,
        userId: testUserId,
        goals: [{ id: goalId, goal_text: testGoal.goalText, description: testGoal.description }],
        actions: [],
        conversation: []
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Add action response:', data);
    
    // Check if the action was created by querying the database
    const { data: actions, error } = await adminSupabase
      .from('tasks')
      .select('*')
      .eq('user_id', testUserId)
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    if (!actions || actions.length === 0) {
      throw new Error('Action was not created in the database');
    }
    
    return { actionId: actions[0].id, action: actions[0] };
  } catch (error) {
    console.error('Error testing action creation:', error);
    throw new Error('Failed to add action');
  }
}

/**
 * Test marking an action as complete
 */
async function testCompleteAction(actionId) {
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Mark the action with ID ${actionId} as complete`,
        userId: testUserId,
        goals: [],
        actions: [{ id: actionId, title: testAction.title, description: testAction.description, frequency: testAction.frequency, completed: false }],
        conversation: []
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Complete action response:', data);
    
    // Check if the action was marked as complete by querying the database
    const { data: actions, error } = await adminSupabase
      .from('tasks')
      .select('*')
      .eq('id', actionId)
      .single();
    
    if (error) throw error;
    
    if (!actions.completed) {
      throw new Error('Action was not marked as complete in the database');
    }
    
    return { message: `Action "${actions.title}" marked as complete`, action: actions };
  } catch (error) {
    console.error('Error testing action completion:', error);
    throw new Error('Failed to mark action as complete');
  }
}

// Run the tests
runTests();
