import type { EntryPage, FieldErrors } from "../domain/guestbook";
export class GuestbookApiError extends Error {
  constructor(
    message: string,
    public fields: FieldErrors = {},
    public status?: number,
  ) {
    super(message);
  }
}
export async function guestbookRequest<T>(
  body?: unknown,
  cursor?: string,
): Promise<T> {
  try {
    const response = await fetch(
      `/api/guestbook${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        cache: "no-store",
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new GuestbookApiError(
        data.error || "발자취를 이용할 수 없습니다.",
        data.fields,
        response.status,
      );
    return data as T;
  } catch (error) {
    if (error instanceof GuestbookApiError) throw error;
    throw new GuestbookApiError(
      "서버에 연결하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.",
    );
  }
}
export const loadEntries = (cursor?: string) =>
  guestbookRequest<EntryPage>(undefined, cursor);
