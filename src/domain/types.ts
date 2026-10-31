export type ChoiceIndex = 0 | 1 | 2 | 3;
export type Answers = Readonly<Partial<Record<number, ChoiceIndex>>>;
export type DomainId = "worship" | "prayer" | "word" | "community" | "daily";
export interface Choice {
  label: string;
  score: number | null;
}
export interface Question {
  id: number;
  domain: DomainId | "reflection";
  prompt: string;
  choices: readonly [Choice, Choice, Choice, Choice];
  scored: boolean;
  description?: string;
}
export interface DomainResult {
  id: DomainId;
  label: string;
  rawScore: number;
  score: number;
  evaluated: number;
}
export interface ScoreFactor {
  questionId: number;
  label: string;
  impact: number;
}
export interface FaithReport {
  score: number;
  grade: number;
  gradeLabel: string;
  headline: string;
  summary: string;
  domains: DomainResult[];
  positiveFactors: ScoreFactor[];
  negativeFactors: ScoreFactor[];
  evaluatedCount: number;
  unevaluatedCount: number;
}
