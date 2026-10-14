// Approximate digital SAT scoring tables.
// Each section: 200-800. Total: 400-1600.
// Score depends on raw correct + module 2 difficulty (easy vs hard route).

export type ModuleDifficulty = "easy" | "hard";
export type Section = "math" | "reading_writing";

const RW_TABLE: Record<ModuleDifficulty, number[]> = {
  // Index = total correct (0..54). Approximate digital SAT curve.
  easy: [200,200,210,220,230,240,250,260,270,280,290,300,310,320,330,340,350,360,370,380,390,400,410,420,430,440,450,460,470,480,490,500,510,520,530,540,545,550,555,560,565,570,575,580,585,590,595,600,605,610,615,620,625,630,635],
  hard: [400,410,420,430,440,450,460,470,480,490,500,510,520,530,540,550,555,560,565,570,575,580,585,590,595,600,605,610,615,620,625,630,635,640,645,650,655,660,665,670,680,690,700,710,720,730,740,750,760,770,780,790,800,800,800],
};

const MATH_TABLE: Record<ModuleDifficulty, number[]> = {
  easy: [200,210,220,230,240,250,260,270,280,290,300,310,320,330,340,350,360,370,380,390,400,410,420,430,440,450,460,470,480,490,500,510,520,530,540,545,550,555,560,565,570,575,580,585,590,595,600,605,610,615,620,625,630,635,640],
  hard: [400,410,420,430,440,450,460,470,480,490,500,510,520,530,540,550,560,570,580,590,600,605,610,615,620,625,630,635,640,650,660,670,680,690,700,710,720,730,740,750,760,770,780,790,800,800,800,800,800,800,800,800,800,800,800],
};

export function sectionScore(section: Section, totalCorrect: number, mod2: ModuleDifficulty): number {
  const tbl = section === "math" ? MATH_TABLE[mod2] : RW_TABLE[mod2];
  const idx = Math.max(0, Math.min(totalCorrect, tbl.length - 1));
  return tbl[idx];
}

// Threshold for routing into the hard module (≥ this many correct in module 1)
export const MODULE_1_THRESHOLD = 16; // out of 27

export function pickModule2Difficulty(module1Correct: number): ModuleDifficulty {
  return module1Correct >= MODULE_1_THRESHOLD ? "hard" : "easy";
}
