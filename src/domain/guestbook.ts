export const visitTypes = {
  personal: "개인",
  community: "교회·모임과 함께",
  visitor: "잠시 방문",
} as const;
export const reportReasons = {
  privacy: "개인정보 노출",
  spam: "광고·도배",
  abuse: "비방·부적절한 내용",
  other: "기타",
} as const;
export type VisitType = keyof typeof visitTypes;
export type ReportReason = keyof typeof reportReasons;
export interface EntryInput {
  visitType: VisitType;
  nickname: string;
  community: string;
  message: string;
  consent: true;
  website: string;
}
export interface PublicEntry {
  id: string;
  visitType: VisitType;
  nickname: string;
  community: string;
  message: string;
  date: string;
}
export interface EntryPage {
  entries: PublicEntry[];
  nextCursor: string | null;
}
export type FieldErrors = Partial<Record<keyof EntryInput, string>>;
export const textLength = (value: string) => Array.from(value.trim()).length;
export function validateEntry(value: unknown): {
  input?: EntryInput;
  errors: FieldErrors;
} {
  const errors: FieldErrors = {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { errors: { message: "입력 내용을 확인해 주세요." } };
  const data = value as Record<string, unknown>;
  if (
    Object.keys(data).some(
      (key) =>
        ![
          "visitType",
          "nickname",
          "community",
          "message",
          "consent",
          "website",
        ].includes(key),
    )
  )
    return { errors: { message: "허용되지 않은 입력 항목입니다." } };
  if (
    typeof data.visitType !== "string" ||
    !Object.hasOwn(visitTypes, data.visitType)
  )
    errors.visitType = "방문 유형을 선택해 주세요.";
  for (const [key, max] of [
    ["nickname", 20],
    ["community", 40],
    ["message", 300],
  ] as const) {
    if (
      typeof data[key] !== "string" ||
      textLength(data[key]) > max ||
      (key === "message" && !textLength(data[key]))
    )
      errors[key] =
        key === "message"
          ? "한마디를 앞뒤 공백을 빼고 1~300자로 입력해 주세요."
          : `${key === "nickname" ? "별명" : "모임명"}은 ${max}자 이내로 입력해 주세요.`;
  }
  if (data.consent !== true)
    errors.consent = "공개와 저장 안내에 동의해 주세요.";
  if (data.website !== "") errors.website = "등록할 수 없는 요청입니다.";
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    input: {
      visitType: data.visitType as VisitType,
      nickname: (data.nickname as string).trim(),
      community:
        data.visitType === "community" ? (data.community as string).trim() : "",
      message: (data.message as string).trim(),
      consent: true,
      website: "",
    },
  };
}
