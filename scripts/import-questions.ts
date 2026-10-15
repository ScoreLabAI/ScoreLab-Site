#!/usr/bin/env bun
// Imports every question-bank/*.json file into the live question bank.
// Run by .github/workflows/import-questions.yml on push; also runnable
// locally with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseQuestionsPayload } from "@/lib/question-import";
import { runQuestionImport } from "@/lib/question-import.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const QUESTION_BANK_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "question-bank");

async function main() {
  const entries = await readdir(QUESTION_BANK_DIR).catch(() => []);
  const files = entries.filter((f) => f.endsWith(".json")).sort();

  if (files.length === 0) {
    console.log(`No .json files in ${QUESTION_BANK_DIR} — nothing to import.`);
    return;
  }

  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalRejected = 0;
  let hadRejections = false;

  for (const file of files) {
    const path = join(QUESTION_BANK_DIR, file);
    const raw = await readFile(path, "utf8");

    let questions;
    try {
      questions = parseQuestionsPayload(raw);
    } catch (e) {
      console.error(`✗ ${file}: ${e instanceof Error ? e.message : String(e)}`);
      hadRejections = true;
      continue;
    }

    const result = await runQuestionImport(supabaseAdmin, questions, false);
    totalInserted += result.inserted;
    totalDuplicates += result.duplicates;
    totalRejected += result.rejected;

    console.log(
      `${file}: ${result.inserted} inserted, ${result.duplicates} duplicates skipped, ${result.rejected} rejected`,
    );
    for (const issue of result.issues) {
      console.error(`  ✗ question ${issue.index}: ${issue.problem}`);
    }
    if (result.rejected > 0) hadRejections = true;
  }

  console.log(
    `\nTotal: ${totalInserted} inserted, ${totalDuplicates} duplicates skipped, ${totalRejected} rejected across ${files.length} file(s).`,
  );

  if (hadRejections) {
    console.error("\nOne or more questions failed validation — fix them and push again.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
