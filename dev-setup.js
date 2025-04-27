// This script sets up the development environment for local testing
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create or update the .env.development file with development-specific settings
const envContent = `
# Development Environment Variables
NODE_ENV=development
VITE_SUPABASE_URL=https://haekhglsuyrfiyrkssfe.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZWtoZ2xzdXlyZml5cmtzc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQxODYsImV4cCI6MjA2MTA3MDE4Nn0.lgaCHeen3UQrCWFTK2rA_Dd1pWQFoRabVKjXmchr__U
# Supabase Service Role Key (needed for AI assistant functionality)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZWtoZ2xzdXlyZml5cmtzc2ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQ5NDE4NiwiZXhwIjoyMDYxMDcwMTg2fQ.phBnIpAfoDXUp7I9bQ4HN_dwxrUNwcaiScOvsVd5O5o
# YOU NEED TO REPLACE THIS WITH YOUR ACTUAL OPENAI API KEY
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_API_KEY=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
VITE_API_BASE_URL=https://mym8.netlify.app/.netlify/functions/api
`;

writeFileSync(join(__dirname, '.env.development'), envContent.trim(), 'utf8');

console.log('\n✅ Development environment set up successfully');
console.log('\n⚠️ IMPORTANT: Edit .env.development and add your OPENAI_API_KEY');
console.log('\n🚀 Run "npm run local" or "start-dev.bat" to start the development server');
console.log('\n🔗 Then visit: http://localhost:8082\n');
