import { describe, expect, it } from "vitest";
import { buildFaithReport, gradeForScore } from "../domain/scoring";
import { questions } from "../data/questions";
import type { Answers, ChoiceIndex } from "../domain/types";
const uniform = (choice: ChoiceIndex): Answers =>
  Object.fromEntries(questions.map((question) => [question.id, choice]));
describe("authoritative question data", () => {
  it("has 12 unique four-choice questions, only the first ten scored", () => {
    expect(questions.map((q) => q.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
    questions.forEach((q) => {
      expect(q.choices).toHaveLength(4);
      expect(q.scored).toBe(q.id <= 10);
    });
    expect(
      questions
        .slice(10)
        .flatMap((q) => q.choices)
        .every((choice) => choice.score === null),
    ).toBe(true);
  });
});
describe("deterministic scoring", () => {
  it("refuses empty, reflection-only and entirely unevaluable answers", () => {
    expect(buildFaithReport({})).toBeNull();
    expect(buildFaithReport({ 11: 0, 12: 2 })).toBeNull();
    expect(buildFaithReport({ 9: 3, 10: 3, 12: 1 })).toBeNull();
  });
  it("gives the exact maximum and the reachable questionnaire minimum", () => {
    expect(buildFaithReport(uniform(0))?.score).toBe(1000);
    // Minimum achievable scores: 0,10,0,15,0,20,0,0,50,35.
    expect(buildFaithReport({ ...uniform(3), 9: 2, 10: 2 })?.score).toBe(131);
    expect(gradeForScore(1).grade).toBe(6);
  });
  it("uses neutral 50 without marking skipped/null answers evaluated", () => {
    const report = buildFaithReport({ 1: 0, 9: 3, 10: 3 })!;
    expect(report.score).toBe(550);
    expect(report.evaluatedCount).toBe(1);
    expect(report.unevaluatedCount).toBe(9);
    expect(report.domains.map((d) => d.evaluated)).toEqual([1, 0, 0, 0, 0]);
    expect(report.positiveFactors).toEqual([
      { questionId: 1, label: "주일예배 참여", impact: 50 },
    ]);
  });
  it("does not round domain scores before the total", () => {
    const report = buildFaithReport({ 1: 1 })!;
    expect(report.domains[0].rawScore).toBe(62.5);
    expect(report.domains[0].score).toBe(63);
    expect(report.score).toBe(525);
  });
  it("does not fabricate factors for neutral answers", () => {
    const report = buildFaithReport({ 9: 2 })!;
    expect(report.score).toBe(501);
    expect(report.positiveFactors).toEqual([]);
    expect(report.negativeFactors).toEqual([]);
    expect(report.summary).toContain("비슷하게");
  });
  it("orders the actual top three positive and negative contributions", () => {
    const report = buildFaithReport({
      1: 0,
      2: 1,
      3: 0,
      4: 0,
      5: 3,
      6: 3,
      7: 3,
      8: 3,
    })!;
    expect(report.positiveFactors.map((f) => f.questionId)).toEqual([1, 3, 4]);
    expect(report.negativeFactors.map((f) => f.questionId)).toEqual([5, 7, 8]);
    expect(report.negativeFactors.map((f) => f.impact)).toEqual([
      -50, -50, -50,
    ]);
  });
  it("Q11 and Q12 never affect any report field, across every pair", () => {
    const baseline = buildFaithReport(uniform(1));
    for (const q11 of [undefined, 0, 1, 2, 3] as const)
      for (const q12 of [undefined, 0, 1, 2, 3] as const) {
        expect(buildFaithReport({ ...uniform(1), 11: q11, 12: q12 })).toEqual(
          baseline,
        );
      }
  });
  it("matches an independent score oracle across 256 mixed patterns, without mutating input", () => {
    for (let seed = 0; seed < 256; seed++) {
      const input = Object.freeze(
        Object.fromEntries(
          questions.map((q, index) => [
            q.id,
            ((seed >> (index % 8)) + index) % 4,
          ]),
        ) as Answers,
      );
      const sum = questions
        .slice(0, 10)
        .reduce((total, q) => total + (q.choices[input[q.id]!].score ?? 50), 0);
      const report = buildFaithReport(input)!;
      expect(report.score).toBe(1 + Math.round((999 * sum) / 1000));
      expect(buildFaithReport(input)).toEqual(report);
      expect(report.score).toBeGreaterThanOrEqual(1);
      expect(report.score).toBeLessThanOrEqual(1000);
    }
  });
});
describe("grade boundaries", () => {
  it.each([
    [1, 6],
    [449, 6],
    [450, 5],
    [599, 5],
    [600, 4],
    [699, 4],
    [700, 3],
    [799, 3],
    [800, 2],
    [899, 2],
    [900, 1],
    [1000, 1],
  ])("%i maps to grade %i", (score, grade) =>
    expect(gradeForScore(score).grade).toBe(grade),
  );
  it.each([0, 1001, NaN, 800.5])("rejects invalid score %s", (score) =>
    expect(() => gradeForScore(score)).toThrow(RangeError),
  );
});
