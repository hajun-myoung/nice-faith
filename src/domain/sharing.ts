export interface SharedResult {
  score: number;
  name: string;
}
export const siteDescription = "12개의 질문, 나의 신앙활동은 몇 점일까요?";
export function normalizeShareName(value: string): string {
  return Array.from(
    value
      .normalize("NFC")
      .replace(/[^\p{L}\p{M}\p{N} ._-]/gu, "")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .slice(0, 20)
    .join("");
}
export function parseSharedResult(search: string): SharedResult | null {
  const params = new URLSearchParams(search);
  const raw = params.get("score");
  if (
    params.getAll("score").length !== 1 ||
    params.getAll("name").length > 1 ||
    !raw ||
    !/^[1-9]\d{0,3}$/.test(raw)
  )
    return null;
  const score = Number(raw);
  if (score > 1000) return null;
  return { score, name: normalizeShareName(params.get("name") ?? "") };
}
export function publicShareUrl(current: string): string {
  const url = new URL(current);
  return `${url.origin}/`;
}
export function resultShareUrl(current: string, result: SharedResult): string {
  if (
    !Number.isInteger(result.score) ||
    result.score < 1 ||
    result.score > 1000
  )
    throw new RangeError("공유 점수 범위는 1~1,000입니다.");
  const url = new URL(publicShareUrl(current));
  url.searchParams.set("score", String(result.score));
  const name = normalizeShareName(result.name);
  if (name) url.searchParams.set("name", name);
  return url.toString();
}
export function resultTitle(result: SharedResult): string {
  return `${result.name ? `${result.name}님의` : "나의"} 신앙활동 점수는 ${result.score.toLocaleString("ko-KR")}점!`;
}
export function sharePayload(
  current: string,
  result?: SharedResult,
): ShareData {
  return result
    ? {
        title: resultTitle(result),
        text: `${normalizeShareName(result.name) ? `${normalizeShareName(result.name)}님의` : "나의"} 신앙 점수는 ${result.score.toLocaleString("ko-KR")}점! 나는 몇 점일까? 내 신앙활동 점수도 확인해 보세요. 숨겨진 의미도 있으니 꼭 확인해 보세요!`,
        url: resultShareUrl(current, result),
      }
    : {
        title: "NICE FAITH — 당신의 믿음, 몇 점입니까?",
        text: siteDescription,
        url: publicShareUrl(current),
      };
}
