# Poll App – Angular + Supabase

This project uses Angular, TypeScript, SCSS and Supabase. There is no login. A browser gets one anonymous voter id in localStorage and stores a survey-specific vote flag after a successful submission.

## Start

1. Run `npm install`.
2. Add your Supabase URL and anon key in `src/app/core/config/supabase.config.ts`.
3. Create the four tables in the Supabase Dashboard as described below.
4. Enable Realtime for `votes`.
5. Make sure the tables are readable/writable for the `anon` role according to your RLS settings.
6. Run `npm start`.

When Supabase is not configured, the application uses local demo data. This lets you test the UI before connecting the backend.

## Supabase tables

### `surveys`

| Column | Type | Important setting |
| --- | --- | --- |
| `id` | uuid | Primary key, default `gen_random_uuid()` |
| `title` | text | Required |
| `category` | text | Required |
| `description` | text | Optional |
| `end_date` | timestamptz | Optional |
| `created_at` | timestamptz | Required, default `now()` |

### `questions`

| Column | Type | Important setting |
| --- | --- | --- |
| `id` | uuid | Primary key, default `gen_random_uuid()` |
| `survey_id` | uuid | Foreign key → `surveys.id`, required |
| `text` | text | Required |
| `position` | integer | Required |

### `options`

| Column | Type | Important setting |
| --- | --- | --- |
| `id` | uuid | Primary key, default `gen_random_uuid()` |
| `question_id` | uuid | Foreign key → `questions.id`, required |
| `text` | text | Required |
| `position` | integer | Required |

### `votes`

| Column | Type | Important setting |
| --- | --- | --- |
| `id` | uuid | Primary key, default `gen_random_uuid()` |
| `survey_id` | uuid | Foreign key → `surveys.id`, required |
| `question_id` | uuid | Foreign key → `questions.id`, required |
| `option_id` | uuid | Foreign key → `options.id`, required |
| `voter_id` | uuid | Required |
| `created_at` | timestamptz | Required, default `now()` |

The Angular app sends one vote row per question when the user completes a survey.

## One vote per survey

The frontend prevents a second submission by storing `poll-app-voted-{surveyId}` in localStorage. The repository also checks Supabase for an existing `votes` row for the same `survey_id` and `voter_id` before inserting.

For an extra database-level guard, add a unique constraint/index for the combination `survey_id + voter_id`. The exact Supabase Dashboard steps are: Table Editor → `votes` → Indexes → create a unique index on those two columns.

This is still an anonymous application: clearing localStorage or using another browser/device creates a new anonymous voter id.

## Realtime

Supabase Dashboard → Database → Replication / Realtime → add `votes` to the realtime publication. The detail page subscribes to changes for the current survey and reloads its result counts.

## Features implemented

- Figma-inspired dark home screen and light survey detail view
- Responsive layout for desktop and mobile
- Ending-soon surveys sorted by nearest deadline
- Active/Past tabs kept separate
- Category filtering with an `All` option for each tab
- New Survey overlay instead of a separate route
- Required-field validation
- Optional description and deadline
- Multiple questions
- Minimum 2 and maximum 5 answers per question
- Survey submission only after every question has an answer
- Past surveys remain viewable but cannot be answered
- Anonymous one-submission-per-survey flow
- Live result refresh through Supabase Realtime
- TypeScript files kept below 400 lines and functions kept below 14 lines

No SQL files are part of this project. The database is intended to be created directly in Supabase.
