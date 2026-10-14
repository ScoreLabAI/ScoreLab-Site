import { callAnthropic } from "./anthropic.server";

export { callAnthropic };

/**
 * Per-skill authoring specs modeled on the real Digital SAT (Bluebook) item formats.
 * Each spec carries the official question stem wording and format constraints so the
 * generator produces items that look and read like the real test.
 */
interface SkillSpec {
  sub: string;
  /** Exact stem wording used on the real test (verbatim where applicable). */
  stem: string;
  /** Format guidance specific to this item type. */
  format: string;
}

export const SECTIONS = [
  {
    section: "math",
    skills: [
      {
        category: "Algebra",
        specs: [
          {
            sub: "Linear equations",
            stem: "Ask for the value of a variable, an expression, or an unknown coefficient.",
            format:
              "One or two sentences, or a short real-world context with clean numbers. No passage. Answer choices are numbers or simple expressions in increasing order.",
          },
          {
            sub: "Linear inequalities",
            stem: "Ask which inequality or system represents the situation, or for the greatest/least possible value.",
            format:
              "Context-based constraint problems (budget, capacity, hours). Choices are inequalities written consistently in the same form.",
          },
          {
            sub: "Systems of equations",
            stem: "Ask for x, y, x+y, or the number of solutions.",
            format:
              "Two equations given inline, or a two-quantity word problem. Integer or simple-fraction solutions.",
          },
        ],
      },
      {
        category: "Advanced Math",
        specs: [
          {
            sub: "Quadratics",
            stem: "Ask for a solution, sum/product of solutions, the vertex, or the value of a constant.",
            format:
              "Give the equation inline using plain-text notation such as x^2 - 6x + 8 = 0. Choices numeric or in the form x = a.",
          },
          {
            sub: "Exponents",
            stem: "Ask for an equivalent expression or the value of an exponential quantity at a given input.",
            format:
              "Exponential growth/decay contexts (population, value, bacteria) or pure equivalent-expression items.",
          },
          {
            sub: "Functions",
            stem: "Ask for f(a), the value of a constant, or which statement about the function is true.",
            format:
              "Define the function inline. May reference a table of values written as plain text rows.",
          },
        ],
      },
      {
        category: "Problem-Solving and Data Analysis",
        specs: [
          {
            sub: "Ratios",
            stem: "Ask for a missing quantity in a proportional relationship or a unit rate.",
            format:
              "Real-world contexts with realistic units (grams per serving, miles per gallon). Include units in choices.",
          },
          {
            sub: "Percentages",
            stem: "Ask for a percent increase/decrease, an original value, or a resulting value.",
            format:
              "Business, science, or survey contexts. Numbers should be realistic, not round-number toy values.",
          },
          {
            sub: "Statistics",
            stem: "Ask about mean, median, standard deviation comparison, sampling validity, or margin of error interpretation.",
            format:
              "Describe a study or dataset in plain text (a small data list or summary table written as text). Inference items must test conclusion validity, not computation.",
          },
        ],
      },
      {
        category: "Geometry and Trigonometry",
        specs: [
          {
            sub: "Triangles",
            stem: "Ask for a side length, angle measure, or area.",
            format:
              "Fully describe the figure in words since no diagram is available. Use similar triangles, the Pythagorean theorem, or angle relationships.",
          },
          {
            sub: "Circles",
            stem: "Ask for radius, arc length, sector area, or an equation of a circle.",
            format:
              "Describe the circle in words or give its equation inline. Radian-measure items are fair game.",
          },
          {
            sub: "Right triangle trig",
            stem: "Ask for sin, cos, tan of an angle, or a missing side.",
            format:
              "Fully describe the right triangle in words. Include complementary-angle relationships (sin x = cos(90 - x)).",
          },
        ],
      },
    ],
  },
  {
    section: "reading_writing",
    skills: [
      {
        category: "Information and Ideas",
        specs: [
          {
            sub: "Central ideas",
            stem: '"Which choice best states the main idea of the text?"',
            format:
              "A single 50-120 word passage on science, history, social science, or literature. Choices are one-sentence statements of similar length.",
          },
          {
            sub: "Inferences",
            stem: '"Which choice most logically completes the text?"',
            format:
              "A 60-120 word passage ending mid-thought with a blank at the very end. Choices complete the logical conclusion, not the grammar.",
          },
          {
            sub: "Evidence",
            stem: '"Which finding, if true, would most directly support (or weaken) the researchers\' hypothesis?"',
            format:
              "A 60-120 word passage describing a study, claim, or hypothesis. Choices are parallel, plausible findings of similar length and specificity.",
          },
        ],
      },
      {
        category: "Craft and Structure",
        specs: [
          {
            sub: "Vocabulary in context",
            stem: '"Which choice completes the text with the most logical and precise word or phrase?"',
            format:
              "A 40-90 word passage with a single blank mid-text. Choices are four single words (or short phrases) of comparable register — no obvious throwaways.",
          },
          {
            sub: "Text structure",
            stem: '"Which choice best describes the function of the quoted sentence in the text as a whole?"',
            format:
              "A 60-110 word passage, then the stem, which quotes the referenced sentence in full inside quotation marks (no underlining, no bracket markers). Choices describe rhetorical function, each beginning with a verb such as \"It illustrates\" or \"It qualifies\".",
          },
          {
            sub: "Cross-text connections",
            stem: '"Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?"',
            format:
              "Two short passages labeled 'Text 1' and 'Text 2' (50-80 words each) presenting related but distinct positions.",
          },
        ],
      },
      {
        category: "Expression of Ideas",
        specs: [
          {
            sub: "Rhetorical synthesis",
            stem: '"The student wants to [specific goal]. Which choice most effectively uses relevant information from the notes to accomplish this goal?"',
            format:
              "Present 4-6 bullet-point research notes (each on its own line beginning with a hyphen), then state the student's goal, then the stem. Choices are one- or two-sentence syntheses.",
          },
          {
            sub: "Transitions",
            stem: '"Which choice completes the text with the most logical transition?"',
            format:
              "A 50-90 word passage with a blank at the start of the final sentence. All four choices are genuine transitions (e.g., However, Therefore, For example, Similarly) that differ in logical relationship.",
          },
        ],
      },
      {
        category: "Standard English Conventions",
        specs: [
          {
            sub: "Sentence structure",
            stem: '"Which choice completes the text so that it conforms to the conventions of Standard English?"',
            format:
              "A 40-70 word passage with a single blank. Test comma splices, run-ons, fragments, or modifier placement. Choices differ only in the tested structure.",
          },
          {
            sub: "Punctuation",
            stem: '"Which choice completes the text so that it conforms to the conventions of Standard English?"',
            format:
              "A 40-70 word passage with a blank. Test colons, semicolons, dashes, or nonrestrictive commas. Choices are near-identical strings differing only in punctuation.",
          },
          {
            sub: "Subject-verb agreement",
            stem: '"Which choice completes the text so that it conforms to the conventions of Standard English?"',
            format:
              "A 40-70 word passage with a blank where a verb or pronoun belongs. Include an intervening phrase between subject and verb. Choices are verb/pronoun forms only.",
          },
        ],
      },
    ],
  },
] as const;

export type SkillSpecT = SkillSpec;

export interface AIQuestion {
  question_text: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  distractor_a_explanation: string;
  distractor_b_explanation: string;
  distractor_c_explanation: string;
  distractor_d_explanation: string;
}

export const SEED_SYSTEM_PROMPT = `You write items for the Digital SAT (Bluebook). Your items are indistinguishable from official College Board released items in wording, length, register, and difficulty calibration.

NON-NEGOTIABLE STYLE RULES

Reading & Writing:
- Every item is ONE self-contained short passage followed by ONE question. Passages are 25-150 words. Never write multi-question passage sets.
- Use the official question stem given in the spec, verbatim where one is quoted.
- Passages are dense, informational, and neutral in tone — an excerpt of real academic or journalistic prose, not a story with characters and dialogue. Literature passages, when used, read like a public-domain 19th-century excerpt.
- NEVER invent a named researcher as the subject ("Dr. Elena Vasquez", "Marine biologist Dr. ..."). If a researcher is needed, use a plausible full name from a wide range of cultures, mentioned once, and vary it across items. Prefer "A 2019 study" or "Researchers at ..." framing.
- Do not open with "The ancient ...", "Scientists have long believed ...", "In recent years ...", or any other stock hook.
- Answer choices are parallel in length, structure, and specificity. No choice should be eliminable on style alone. The correct choice must not be the longest or most detailed.
- Content areas must vary widely: literature, poetry, history/social studies documents, and science are all in scope.

Math:
- No passage. Concise stems — most items are one to three sentences.
- Plain-text math notation only: x^2, sqrt(5), <=, >=, pi, 3/4. Never LaTeX, never markdown.
- Since no images can be shown, fully describe any figure, table, or graph in words (a table may be written as plain text rows).
- Numeric answer choices are ordered least to greatest and are plausible results of specific, nameable student errors (sign error, wrong operation, forgetting to halve, using diameter for radius).
- Contexts, when used, are realistic and briefly stated. No whimsical or juvenile framing.

Difficulty calibration:
1 (easy) — single step, direct application, minimal reading load.
2 (medium) — two steps or one modest inference; a common misconception is tested.
3 (hard) — multi-step reasoning, abstract parameters, subtle distinctions between close choices; a strong student should need to work.

Answer key: distribute the correct letter evenly and unpredictably across A/B/C/D.

Explanations: 2-4 sentences, teaching the reasoning path (not just restating the answer). Each distractor explanation names the specific error that produces that choice.

OUTPUT: valid JSON only, no prose, no markdown fences:
{"questions":[{"question_text":"","answer_a":"","answer_b":"","answer_c":"","answer_d":"","correct_answer":"A","explanation":"","distractor_a_explanation":"","distractor_b_explanation":"","distractor_c_explanation":"","distractor_d_explanation":""}]}

All content must be original. Never reproduce copyrighted passages or released test items.`;

export function buildBatchPrompt(args: {
  section: "math" | "reading_writing";
  category: string;
  spec: SkillSpec;
  difficulty: 1 | 2 | 3;
  count: number;
}) {
  const sectionLabel = args.section === "math" ? "Math" : "Reading and Writing";
  const diffLabel = args.difficulty === 1 ? "easy" : args.difficulty === 2 ? "medium" : "hard";
  return `Write ${args.count} Digital SAT ${sectionLabel} items.

Domain: ${args.category}
Skill: ${args.spec.sub}
Question stem: ${args.spec.stem}
Format requirements: ${args.spec.format}
Difficulty: ${args.difficulty} (${diffLabel})

The ${args.count} items must differ from each other in topic, context, and correct-answer letter.

Return JSON only.`;
}

export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Reject items that violate hard quality rules before they reach the bank. */
const BANNED_PATTERNS = [
  /Dr\.\s+Elena\s+Vasquez/i,
  /\\\(|\\\[|\$\$/, // LaTeX
  /^\s*In recent years/i,
  /^\s*Scientists have long believed/i,
];

export function validateQuestion(q: AIQuestion, section: "math" | "reading_writing"): string | null {
  const required: Array<keyof AIQuestion> = [
    "question_text",
    "answer_a",
    "answer_b",
    "answer_c",
    "answer_d",
    "explanation",
  ];
  for (const k of required) {
    if (!q[k] || String(q[k]).trim().length === 0) return `empty field ${k}`;
  }
  if (!["A", "B", "C", "D"].includes(q.correct_answer)) return "invalid correct_answer";

  const choices = [q.answer_a, q.answer_b, q.answer_c, q.answer_d].map((c) => c.trim());
  if (new Set(choices.map((c) => c.toLowerCase())).size !== 4) return "duplicate answer choices";

  for (const p of BANNED_PATTERNS) {
    if (p.test(q.question_text)) return `banned pattern ${p}`;
  }

  const words = q.question_text.trim().split(/\s+/).length;
  if (section === "reading_writing") {
    if (words < 30) return "passage too short";
    if (words > 260) return "passage too long";
  } else {
    if (words > 140) return "math stem too long";
  }
  return null;
}
