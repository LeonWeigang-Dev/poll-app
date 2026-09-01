# Poll App

Angular 21 + TypeScript + SCSS poll application based on the supplied Figma screens and project checklist.

## Local setup

1. Run `npm install`.
2. Put your Supabase project URL and anon key into `src/app/core/config/supabase.config.ts`.
3. Run `supabase-schema.sql` in Supabase SQL Editor.
4. Run `npm start`.

Until Supabase credentials are entered, the app uses demo data so the UI can be developed locally.

## Supabase

The schema creates surveys, questions, options and votes. Realtime is enabled for `votes` so the result panel refreshes after a vote from another client.
