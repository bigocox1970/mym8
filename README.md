# My M8 - Goal Tracking Application

## Project Status

**Current Status**: Beta version with core functionality implemented.

This application helps users track their personal goals and daily/weekly/monthly actions, with the ability to monitor progress and view activity history.

## Features Implemented

- **User Authentication**: Sign-up, login, and secure user sessions
- **Goal Management**: Create, edit, view, and manage personal goals with descriptions
- **Action Management**: Add actions to goals with different frequencies (morning, afternoon, evening, daily, weekly, monthly)
- **Progress Tracking**: Dashboard with progress bars showing completion rates for daily, weekly and monthly actions
- **Activity Log**: View history of completed actions with filtering capabilities
- **Dark/Light Mode**: Support for both dark and light themes
- **Responsive Design**: Works on both desktop and mobile devices

## Technical Implementation

- **Frontend**: React with TypeScript, Vite for build tooling
- **UI Framework**: shadcn-ui components with Tailwind CSS for styling
- **Database**: Supabase for real-time PostgreSQL database
- **Authentication**: Supabase Auth for user management
- **State Management**: React Context and React Query for data fetching

## What's Left to Do

- **Notifications**: Add reminders for incomplete actions
- **Streak Tracking**: Track consecutive days of task completion
- **Action Recurrence**: Set up automatic action resetting for daily/weekly/monthly tasks
- **Sharing & Social**: Allow sharing goals or progress with friends or a community
- **Export/Import**: Implement data export/import functionality
- **Advanced Analytics**: More detailed statistics on action completion patterns
- **Mobile App**: Convert to native mobile application
- **Performance Optimizations**: Improve loading times and reduce API calls
- **User Settings**: Additional user customization options

## Getting Started

Follow these steps to set up the project locally:

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd mym8

# Install dependencies
npm i

# Start the development server
npm run dev
```

## Database Setup

The application uses Supabase as the backend. You'll need to:

1. Create a Supabase project
2. Run the migration scripts in the `supabase/migrations` directory
3. Update the environment variables with your Supabase URL and anon key

## Project Structure

- `/src` - Application source code
  - `/components` - Reusable UI components
  - `/contexts` - React Context providers
  - `/hooks` - Custom React hooks
  - `/lib` - Utility functions and libraries
  - `/pages` - Main application pages
  - `/integrations` - Third-party integrations
- `/public` - Static assets
- `/supabase` - Supabase configuration and migrations

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase
- React Query

## Project info

**URL**: https://lovable.dev/projects/66b114b3-f95b-46fd-b026-55e2bd9b9853

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/66b114b3-f95b-46fd-b026-55e2bd9b9853) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/66b114b3-f95b-46fd-b026-55e2bd9b9853) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
