# MyM8 App Deployment Instructions

This document contains step-by-step instructions for deploying the MyM8 app to Netlify using GitHub.

## Prerequisites

- GitHub account
- Netlify account
- Git installed on your local machine

## Step 1: Push to GitHub

1. Initialize a Git repository (if not already done):
   ```
   git init
   ```

2. Add all files to Git:
   ```
   git add .
   ```

3. Commit your changes:
   ```
   git commit -m "Initial commit for MyM8 app with AI assistant functionality fixed"
   ```

4. Add the remote repository:
   ```
   git remote add origin https://github.com/bigocox1970/mym8-app.git
   ```

5. Push your code:
   ```
   git push -u origin main
   ```
   
   If your default branch is called 'master' instead of 'main', use:
   ```
   git push -u origin master
   ```

## Step 2: Deploy to Netlify

1. Log in to [Netlify](https://app.netlify.com/)

2. Click "Add new site" → "Import an existing project"

3. Select GitHub and authenticate if needed

4. Find and select your `mym8-app` repository

5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

6. Click "Show advanced" to add environment variables

7. Add all variables from the `netlify-env-vars.txt` file:
   - Copy each line from the file
   - Add each as a separate environment variable in Netlify
   - Ensure you include the Supabase service role key which is critical for AI assistant functionality

8. Click "Deploy site"

## Step 3: Verify Deployment

1. Wait for the deployment to complete (watch the deployment progress in Netlify)

2. Once deployed, click on the URL Netlify provides to access your site

3. Test the AI assistant functionality:
   - Log in to the app
   - Navigate to the AI Assistant page
   - Try creating a new goal by asking the assistant
   - Try adding actions to a goal
   - Try marking actions as complete

## Troubleshooting

If you encounter issues with the AI assistant after deployment:

1. Check Netlify's function logs for errors:
   - Go to your site in Netlify
   - Navigate to Functions > api > Logs
   - Look for any error messages related to Supabase or OpenAI

2. Verify environment variables:
   - Ensure all variables from `netlify-env-vars.txt` were added correctly
   - Make sure the Supabase service role key is correct

3. If issues persist, try redeploying:
   - Go to Deploys in Netlify
   - Click "Trigger deploy" > "Clear cache and deploy site"

## Next Steps

Once deployed successfully, you can:

1. Set up a custom domain in Netlify
2. Configure social logins in Supabase
3. Enable HTTPS
4. Set up continuous deployment from your GitHub repository
