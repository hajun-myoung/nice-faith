import { domainDefinitions, factorLabels, questions } from "../data/questions";
import type { Answers, FaithReport } from "./types";
export const grades = [
  {
    min: 900,
    grade: 1,
    label: "최상위 활동지표",
    headline: "매우 우수한 활동지표입니다.",
  },
  {
    min: 800,
    grade: 2,
    label: "우수 활동지표",
    headline: "안정적인 신앙활동을 유지하고 있습니다.",
  },
  {
    min: 700,
    grade: 3,
    label: "양호 활동지표",
    headline: "전반적으로 양호한 활동지표입니다.",
  },
  {
    min: 600,
    grade: 4,
    label: "보통 활동지표",
    headline: "활동 영역 간 차이가 확인되었습니다.",
  },
  {
    min: 450,
    grade: 5,
    label: "개선 가능 지표",
    headline: "일부 활동지표에 개선 여지가 있습니다.",
  },
  {
    min: 1,
    grade: 6,
    label: "활동지표 낮음",
    headline: "현재 활동지표가 낮게 산출되었습니다.",
  },
] as const;
export function gradeForScore(score: number) {
  if (!Number.isInteger(score) || score < 1 || score > 1000)
    throw new RangeError("점수 범위는 1~1,000입니다.");
  return grades.find((grade) => score >= grade.min)!;
}
export function buildFaithReport(answers: Answers): FaithReport | null {
  const scoredQuestions = questions.filter((question) => question.scored);
  const raw = scoredQuestions.map(
    (question) =>
      question.choices[answers[question.id] as number]?.score ?? null,
  );
  if (raw.every((value) => value === null)) return null;
  const effective = raw.map((value) => value ?? 50);
  const domains = domainDefinitions.map((domain) => {
    const indices = scoredQuestions.flatMap((question, index) =>
      question.domain === domain.id ? [index] : [],
    );
    const rawScore =
      indices.reduce((sum, index) => sum + effective[index], 0) /
      indices.length;
    return {
      ...domain,
      rawScore,
      score: Math.round(rawScore),
      evaluated: indices.filter((index) => raw[index] !== null).length,
    };
  });
  const score =
    1 +
    Math.round(
      (999 * domains.reduce((sum, domain) => sum + domain.rawScore, 0)) / 500,
    );
  const grade = gradeForScore(score);
  const factors = raw.flatMap((value, index) =>
    value === null
      ? []
      : [
          {
            questionId: scoredQuestions[index].id,
            label: factorLabels[index],
            impact: Math.round((999 * (value - 50)) / 1000),
          },
        ],
  );
  const ordered = [...domains].sort((a, b) => b.rawScore - a.rawScore);
  const highest = ordered[0];
  const lowest = ordered[ordered.length - 1];
  return {
    score,
    grade: grade.grade,
    gradeLabel: grade.label,
    headline: grade.headline,
    domains,
    summary:
      highest.rawScore === lowest.rawScore
        ? "다섯 영역의 활동지표가 비슷하게 나타났습니다."
        : `${highest.label} 영역의 활동지표가 상대적으로 높고, ${lowest.label} 영역은 상대적으로 낮게 나타났습니다.`,
    positiveFactors: factors
      .filter((factor) => factor.impact > 0)
      .sort((a, b) => b.impact - a.impact || a.questionId - b.questionId)
      .slice(0, 3),
    negativeFactors: factors
      .filter((factor) => factor.impact < 0)
      .sort((a, b) => a.impact - b.impact || a.questionId - b.questionId)
      .slice(0, 3),
    evaluatedCount: raw.filter((value) => value !== null).length,
    unevaluatedCount: raw.filter((value) => value === null).length,
  };
}
