# MyM8 Documentation

Welcome to the MyM8 documentation. This section contains detailed information about how different parts of the application work.

## Available Documentation

### Configuration
- [Configuration System](configuration.md) - How to customize the application's configuration including AI prompts, voice settings, and more

### Core Functionality
- [Task Reset System](task_reset_system.md) - How tasks automatically reset based on their frequency

## Database Schema

The application uses Supabase as its database with the following key tables:

### User Tables
- `auth.users` - Supabase Auth users
- `profiles` - User profile information 

### Task Management
- `goals` - User goals
- `tasks` - Actions associated with goals
- `activity_logs` - History of completed actions

### AI Features
- `llm_configs` - AI assistant configurations
- `conversations` - Chat conversations 
- `chat_messages` - Individual chat messages

## SQL Migrations

Key migrations that implement core functionality:

- `20250430000000_create_reset_actions.sql` - Creates the task reset system
- `20250501000000_add_action_skipped_status.sql` - Enhances the task reset system with skipped status
- `20250525000000_add_llm_configs_rls.sql` - Row-level security for LLM configurations
- `20250531000000_add_voice_service_fields.sql` - Adds voice service options

## Adding Documentation

When adding new features to MyM8, please also update the documentation:

1. Create a markdown file explaining the feature
2. Add a link to it in this index
3. Include both user-facing and technical details 