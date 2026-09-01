# Poll App

Angular 21 + TypeScript + SCSS poll application based on the supplied Figma screens and project checklist.

## Local setup

1. Run `npm install`.
2. Put your Supabase project URL and anon key into `src/app/core/config/supabase.config.ts`.
3. Create the required tables directly in the Supabase Dashboard (see the table structure below).
4. Enable Realtime for the `votes` table.
5. Run `npm start`.

Until Supabase credentials are entered, the app uses demo data so the UI can be developed locally.

## Supabase tables

The Angular code expects these four public tables:

- `surveys`: `id`, `title`, `category`, `description`, `end_date`, `created_at`
- `questions`: `id`, `survey_id`, `text`, `position`, linked to `surveys.id`
- `options`: `id`, `question_id`, `text`, `position`, linked to `questions.id`
- `votes`: `id`, `survey_id`, `question_id`, `option_id`, `voter_id`, `created_at`

`votes` should have foreign keys to the related survey, question and option. Realtime should be enabled for `votes`.

The app has no login. A browser gets one anonymous voter id in localStorage and stores a survey-specific `poll-app-voted-{surveyId}` flag after a successful submission. This prevents another submission from the same browser for that survey. It is not a security mechanism against users clearing localStorage or using another browser/device.
