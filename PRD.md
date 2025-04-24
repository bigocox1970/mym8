🧠 MyM8.app – Product Requirements Document (PRD)
1. Overview
MyM8.app is a voice-first journaling and self-help app designed to help users manage depression, shift negative thoughts, and work toward personal goals. The app uses LLMs for real-time encouragement, goal tracking, and habit formation. Users interact via voice and text, and AI provides empathetic and tailored responses.

2. Key Features
✅ Authentication & Profile
Email/password login (completed)

Avatar + profile editing (completed)

Dark mode toggle (completed)

✅ Dashboard (completed)
Progress bar for goal completion

Daily motivational message

Snapshot of journal streak, mood, and AI feedback

✅ Goals Page (completed)
Add/Edit/Delete goals

Optionally assign categories (e.g., health, work, relationships)

Toggle goal visibility/status

✅ Journal Page (completed)
Daily voice or text input

Text transcribed and saved to user journal

Entries tagged by emotion and topic (future AI enhancement)

🔜 Admin LLM Configurator
Select different LLMs for use cases (Journaling, Depression, Addiction)

Assign pre-prompts to each use case

Save configs to database for dynamic runtime use

🔜 AI Assistant Engine
Analyze journal entries for emotion and tone

Compare progress against goals

Provide encouragement, quotes, or goal-focused nudges

Morning/evening voice check-ins (based on time)

🔜 Voice-to-Text Module
Integrate Whisper API or Deepgram for transcription

Allow user to speak and log entries directly

🔜 Mood Tracker (optional future)
Emoji or slider scale for user mood each entry

3. Database Schema (Partial)
users (managed by Supabase)
goals
sql
Copy
Edit
id uuid PK
user_id uuid FK → users
text text
category text
completed boolean default false
created_at timestamp
journal_entries
sql
Copy
Edit
id uuid PK
user_id uuid FK → users
content text
mood int (optional)
emotion_tags text[] (optional)
created_at timestamp
llm_configs
sql
Copy
Edit
id uuid PK
function_name text
llm_provider text
api_key text (encrypted or env ref)
pre_prompt text
created_at timestamp
4. Admin Panel UI Ideas

Function	LLM	Pre-Prompt
Journaling	GPT-4	“Act like a kind therapist…”
Depression Help	Claude	“Use CBT techniques…”
Addiction Help	Mixtral	“Use motivational interviewing”
5. Future Enhancements
LLM-powered recommendations

Chat-style guidance sessions

Export/share journal feature

Offline storage for entries

AI-generated goals based on journal content

6. Drawings / Wireframes
Would you like a few wireframes or a component map for:

Admin LLM configuration page?

Morning/Evening encouragement module?

Voice-to-text recording UI?

