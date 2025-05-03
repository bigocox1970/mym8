# Daily Task Reset Function

This is a Supabase Edge Function that resets daily tasks at midnight. It calls the database function `reset_completed_actions()` which marks completed tasks as uncompleted based on their frequency.

## Deployment

1. Make sure you have the Supabase CLI installed:
   ```
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```
   supabase login
   ```

3. Deploy the function:
   ```
   supabase functions deploy reset-daily-tasks --project-ref your-project-ref
   ```

## Scheduling

There are several ways to schedule this function to run at midnight:

### Option 1: Supabase Scheduler (If available)

If your Supabase plan includes scheduler functionality, you can schedule the function to run daily at midnight.

### Option 2: External Scheduler (Recommended)

Use an external service to call this function at the scheduled time:

1. **GitHub Actions**: Set up a GitHub workflow that runs at midnight:
   ```yaml
   name: Reset Daily Tasks
   on:
     schedule:
       - cron: '0 0 * * *'  # Midnight every day
   jobs:
     reset-tasks:
       runs-on: ubuntu-latest
       steps:
         - name: Call Reset Function
           run: |
             curl -X POST https://your-project-ref.supabase.co/functions/v1/reset-daily-tasks \
             -H "Authorization: Bearer ${{ secrets.SUPABASE_KEY }}" \
             -H "Content-Type: application/json"
   ```

2. **Cloudflare Workers**: Set up a Cloudflare Worker with the Cron Trigger feature.

3. **AWS Lambda + EventBridge**: Create an AWS Lambda function and schedule it with EventBridge.

4. **Upstash**: Use Upstash's QStash or Upstash Cron to schedule API calls.

## Testing

You can test the function by making a POST request to it:

```
curl -X POST https://your-project-ref.supabase.co/functions/v1/reset-daily-tasks \
  -H "Authorization: Bearer your-service-role-key" \
  -H "Content-Type: application/json"
```

## Function Behavior

1. The function uses the Supabase service role key to call the database function.
2. It resets all daily tasks (morning, afternoon, evening, daily) where the completion date is before the current date.
3. It also resets weekly tasks completed more than 7 days ago and monthly tasks completed more than 30 days ago.

## Troubleshooting

If the function fails to reset tasks:

1. Check that the function has been deployed correctly
2. Verify that the Supabase service role key is valid
3. Check the Supabase logs for any error messages
4. Make sure the `reset_completed_actions` function exists in your database

## Security Considerations

- This function requires authentication to prevent unauthorized access
- Use a service role key with minimal permissions required for the task
- Store your keys securely in your CI/CD service's secrets manager 