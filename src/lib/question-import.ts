// Client-safe schema + validation for manually authored question uploads.

export const VALID_SECTIONS = ["math", "reading_writing"] as const;
export const VALID_ANSWERS = ["A", "B", "C", "D"] as const;

export interface ImportQuestion {
  section: string;
  skill_category: string;
  skill_subcategory?: string | null;
  difficulty: number;
  question_text: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: string;
  explanation?: string | null;
  distractor_a_explanation?: string | null;
  distractor_b_explanation?: string | null;
  distractor_c_explanation?: string | null;
  distractor_d_explanation?: string | null;
  is_diagnostic?: boolean;
  module_type?: string;
}

export interface ImportIssue {
  index: number;
  problem: string;
}

/** Accepts either a bare array or { questions: [...] }. */
export function parseQuestionsPayload(raw: string): ImportQuestion[] {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("File is empty");
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    throw new Error("Not valid JSON — check for trailing commas or missing brackets");
  }
  const arr = Array.isArray(json)
    ? json
    : (json as { questions?: unknown })?.questions;
  if (!Array.isArray(arr)) {
    throw new Error('Expected a JSON array of questions, or an object like { "questions": [...] }');
  }
  return arr as ImportQuestion[];
}

export function validateImportQuestion(q: ImportQuestion): string | null {
  if (!q || typeof q !== "object") return "not an object";
  if (!VALID_SECTIONS.includes(q.section as (typeof VALID_SECTIONS)[number])) {
    return `section must be "math" or "reading_writing" (got "${q.section}")`;
  }
  if (!q.skill_category?.trim()) return "skill_category is required";
  if (![1, 2, 3].includes(Number(q.difficulty))) return "difficulty must be 1, 2, or 3";
  if (!q.question_text?.trim()) return "question_text is required";
  const choices = [q.answer_a, q.answer_b, q.answer_c, q.answer_d];
  if (choices.some((c) => !c?.toString().trim())) return "all four answer choices are required";
  const unique = new Set(choices.map((c) => c.toString().trim().toLowerCase()));
  if (unique.size < 4) return "answer choices must be distinct";
  const correct = q.correct_answer?.toString().trim().toUpperCase();
  if (!VALID_ANSWERS.includes(correct as (typeof VALID_ANSWERS)[number])) {
    return `correct_answer must be A, B, C, or D (got "${q.correct_answer}")`;
  }
  return null;
}

export const IMPORT_TEMPLATE = `{
  "questions": [
    {
      "section": "reading_writing",
      "skill_category": "Craft and Structure",
      "skill_subcategory": "Words in Context",
      "difficulty": 2,
      "question_text": "Passage text here...\\n\\nWhich choice completes the text with the most logical and precise word or phrase?",
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
}`;
