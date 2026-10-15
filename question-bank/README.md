# Question bank

Drop a `.json` file in this directory and push it — a GitHub Action
(`.github/workflows/import-questions.yml`) imports every question in it into
the live `questions` table automatically. No manual upload through the admin
panel needed, though that still works too and uses the exact same validation
and duplicate-detection code (`src/lib/question-import.server.ts`).

## Format

Either a bare array or `{ "questions": [...] }`:

```json
{
  "questions": [
    {
      "section": "reading_writing",
      "skill_category": "Craft and Structure",
      "skill_subcategory": "Words in Context",
      "difficulty": 2,
      "question_text": "Passage text here...\n\nWhich choice completes the text with the most logical and precise word or phrase?",
      "answer_a": "ambiguous",
      "answer_b": "meticulous",
      "answer_c": "arbitrary",
      "answer_d": "provisional",
      "correct_answer": "B",
      "explanation": "Why B is correct.",
      "distractor_a_explanation": "Why A is wrong.",
      "distractor_b_explanation": "",
      "distractor_c_explanation": "Why C is wrong.",
      "distractor_d_explanation": "Why D is wrong.",
      "is_diagnostic": true
    }
  ]
}
```

- `section`: `"math"` or `"reading_writing"`
- `difficulty`: `1`, `2`, or `3`
- `correct_answer`: `"A"`, `"B"`, `"C"`, or `"D"`
- All four answer choices are required and must be distinct

## What happens on push

1. The workflow triggers only when a file under `question-bank/*.json` changes, on `main`.
2. Every file in this directory is re-imported, not just the changed one.
3. Each question is checked against every question ever stored (active or
   retired) by normalized wording — exact re-uploads are silently skipped, so
   a growing file only adds what's new.
4. A question that fails validation fails the whole workflow run (check the
   Actions log for which question and why) — nothing partially-bad gets in
   silently.

## One-time setup

The workflow needs two repository secrets (**Settings → Secrets and
variables → Actions → New repository secret**), set directly in GitHub —
never pasted anywhere else:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API Keys → `service_role` /
  `secret` key in your Supabase dashboard — this key bypasses row-level
  security, so it only ever belongs in a CI secret or server environment,
  never in `.env` committed to git or in client-side code)
