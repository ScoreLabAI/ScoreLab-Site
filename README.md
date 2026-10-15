# ScoreLab AI

AI-powered SAT prep platform. Adaptive diagnostic, practice sessions with an
AI tutor, spaced-repetition scheduling, score trajectory, and an admin panel
for importing and reviewing the question bank.

## Stack

- **Framework:** TanStack Start v1 (React 19, Vite 7, TanStack Router) — full-stack
  with SSR and server functions
- **Styling:** Tailwind CSS v4 (theme tokens in `src/styles.css`)
- **Backend:** Supabase (Postgres, auth, RLS). Tables, row-level security, and
  seed data live in `supabase/migrations/`
- **AI:** Anthropic Claude for question generation, tutor explanations, and
  answer feedback
- **Calculator:** Official Desmos Graphing Calculator API, shown during Math modules
- **Deploy target:** Cloudflare Workers (`wrangler.jsonc`)

## Layout

```text
src/routes/          one file per page (/, /diagnostic, /practice, /progress, /admin, ...)
src/lib/             server functions (.functions.ts) and server-only logic (.server.ts)
src/components/      shared UI, including DesmosCalculator.tsx
src/integrations/    Supabase client + auth middleware (auto-generated)
supabase/migrations/ database schema, RLS policies, and triggers
question-bank/       question .json files, auto-imported on push (see its README)
scripts/             standalone CI scripts (bun scripts/import-questions.ts)
```

Server-only code must not be imported statically from route files. Route files
import `.functions.ts` modules, which load their `.server.ts` logic with a
dynamic `await import()` inside the handler.

## Getting started

1. Install dependencies:

   ```bash
   bun install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project values, plus
   `ANTHROPIC_API_KEY`.

3. Apply the database migrations to your Supabase project so the tables, row
   level security policies, and the privilege escalation trigger exist:

   ```bash
   supabase db push
   ```

4. Start the dev server:

   ```bash
   bun run dev
   ```

5. Build / preview / lint:

   ```bash
   bun run build
   bun run preview
   bun run lint
   ```

## Notes

- The first signed-up account should be promoted to `admin` in `profiles`; the
  `prevent_privilege_escalation_trigger` migration blocks anyone else from
  raising their own role.
- Question imports are deduplicated by normalized wording, including against
  retired questions, so re-uploading a growing file only adds new items.
- Payments (Stripe) are not implemented yet.
