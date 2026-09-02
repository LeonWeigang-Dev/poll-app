# Poll App – Angular + Supabase

This project uses Angular, TypeScript, SCSS and Supabase. There is no login.

## Supabase setup

Create these four public tables in Supabase:

### surveys
- `id` – uuid, primary key, default `gen_random_uuid()`
- `title` – text, not null
- `category` – text, not null
- `description` – text, nullable
- `end_date` – timestamptz, nullable
- `created_at` – timestamptz, not null, default `now()`

### questions
- `id` – uuid, primary key, default `gen_random_uuid()`
- `survey_id` – uuid, not null, foreign key → `surveys.id`, on delete cascade
- `text` – text, not null
- `position` – integer, not null, default `0`
- `allow_multiple` – boolean, not null, default `false`

### options
- `id` – uuid, primary key, default `gen_random_uuid()`
- `question_id` – uuid, not null, foreign key → `questions.id`, on delete cascade
- `text` – text, not null
- `position` – integer, not null, default `0`

### votes
- `id` – uuid, primary key, default `gen_random_uuid()`
- `survey_id` – uuid, not null, foreign key → `surveys.id`, on delete cascade
- `question_id` – uuid, not null, foreign key → `questions.id`, on delete cascade
- `option_id` – uuid, not null, foreign key → `options.id`, on delete cascade
- `voter_id` – text, not null
- `created_at` – timestamptz, not null, default `now()`

Create a unique constraint on `votes(survey_id, question_id, option_id, voter_id)`.

## RLS / Realtime

The Angular app uses the public anon key and does not authenticate users. Enable RLS on the four tables and add policies that allow the public client to:

- select surveys, questions, options and votes
- insert surveys, questions and options
- insert votes

Enable Realtime for the `votes` table so the result panel can refresh when new votes arrive.

For a production application, stronger anti-abuse protection would require authenticated users or server-side vote validation. For this no-login project, the browser keeps one voter id in localStorage and stores a completed-survey flag locally.

## Angular configuration

Open `src/app/core/config/supabase.config.ts` and replace the two placeholders with the Supabase project URL and anon key.

Do not put a Supabase service-role key into the Angular application.

## Demo mode

Until Supabase is configured, the app falls back to local demo data. This makes it possible to develop the UI before the database is connected.

## Main features

- Ending soon surveys sorted by earliest deadline
- Active / Past survey tabs with independent category filtering
- Create Survey overlay with required field validation
- Unlimited questions, with up to six answers per question
- Single choice and multiple choice questions
- Survey details with live result panel
- One completed submission per survey and browser
- Supabase Realtime refresh for votes
