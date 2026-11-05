import type { IncomingMessage, ServerResponse } from "node:http";
import { guestbookDatabase } from "./firebase";
import {
  GuestbookError,
  GuestbookService,
  newIdentity,
  secureEqual,
} from "./service";

export type ApiRequest = IncomingMessage & { body?: unknown };
function service() {
  const secret = process.env.GUESTBOOK_SECRET;
  if (!secret || secret.length < 32) throw new Error("Missing server secret");
  return new GuestbookService(guestbookDatabase(), secret);
}
function json(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.end(JSON.stringify(body));
}
async function readBody(request: ApiRequest) {
  if (!(request.headers["content-type"] ?? "").startsWith("application/json"))
    throw new GuestbookError(415, "JSON 요청이 필요합니다.");
  if (Number(request.headers["content-length"] ?? 0) > 8192)
    throw new GuestbookError(413, "요청이 너무 큽니다.");
  if (request.body !== undefined) {
    if (
      Buffer.byteLength(
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body),
      ) > 8192
    )
      throw new GuestbookError(413, "요청이 너무 큽니다.");
    try {
      return typeof request.body === "string"
        ? JSON.parse(request.body)
        : request.body;
    } catch {
      throw new GuestbookError(400, "잘못된 JSON 요청입니다.");
    }
  }
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 8192) throw new GuestbookError(413, "요청이 너무 큽니다.");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new GuestbookError(400, "잘못된 JSON 요청입니다.");
  }
}
function identity(
  request: ApiRequest,
  response: ServerResponse,
  api: GuestbookService,
  requireExisting = false,
) {
  const cookie = /(?:^|;\s*)nf_guest=([^;]+)/.exec(
    request.headers.cookie ?? "",
  )?.[1];
  const now = Date.now();
  if (cookie) {
    const [id, until, signature] = cookie.split(".");
    if (
      /^[A-Za-z0-9_-]{32}$/.test(id) &&
      Number(until) > now &&
      Number(until) <= now + 86_400_000 &&
      signature &&
      secureEqual(signature, api.sign(`cookie:${id}.${until}`))
    )
      return id;
  }
  const id = newIdentity(),
    until = now + 86_400_000;
  response.setHeader(
    "Set-Cookie",
    `nf_guest=${id}.${until}.${api.sign(`cookie:${id}.${until}`)}; HttpOnly; SameSite=Strict; Path=/api/guestbook; Max-Age=86400${process.env.VERCEL ? "; Secure" : ""}`,
  );
  if (requireExisting)
    throw new GuestbookError(
      409,
      "도배 방지용 쿠키가 준비되었습니다. 쿠키를 허용하고 다시 등록해 주세요.",
    );
  return id;
}
export function createGuestbookHandler(getService = service, cleanup = false) {
  return async (request: ApiRequest, response: ServerResponse) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (cleanup) {
        if (request.method !== "GET")
          throw new GuestbookError(405, "허용되지 않은 요청입니다.");
        const secret = process.env.CRON_SECRET;
        if (
          !secret ||
          secret.length < 32 ||
          !secureEqual(request.headers.authorization ?? "", `Bearer ${secret}`)
        )
          throw new GuestbookError(401, "인증이 필요합니다.");
        json(response, 200, await getService().cleanup());
        return;
      }
      if (request.method !== "GET" && request.method !== "POST") {
        response.setHeader("Allow", "GET, POST");
        throw new GuestbookError(405, "허용되지 않은 요청입니다.");
      }
      const host = request.headers.host;
      if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host))
        throw new GuestbookError(400, "잘못된 요청입니다.");
      const url = new URL(request.url ?? "/api/guestbook", `https://${host}`);
      if (request.method === "POST") {
        const expected = `${process.env.VERCEL ? "https" : host.startsWith("localhost:") || host.startsWith("127.0.0.1:") ? "http" : "https"}://${host}`;
        if (
          request.headers.origin !== expected ||
          request.headers["sec-fetch-site"] === "cross-site"
        )
          throw new GuestbookError(403, "같은 사이트에서 다시 요청해 주세요.");
        const body = await readBody(request);
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new GuestbookError(400, "잘못된 요청입니다.");
        const allowed =
          body.action === "create"
            ? ["action", "requestId", "submittedAt", "input"]
            : body.action === "report"
              ? ["action", "id", "reason"]
              : body.action === "delete"
                ? ["action", "id", "token"]
                : [];
        if (
          !allowed.length ||
          Object.keys(body).some((key) => !allowed.includes(key))
        )
          throw new GuestbookError(400, "잘못된 요청입니다.");
        const api = getService();
        if (body.action === "delete") {
          await api.remove(body.id, body.token);
          json(response, 200, { ok: true });
          return;
        }
        const visitor = identity(request, response, api, true);
        // On Vercel this header is overwritten by the edge. Never trust x-forwarded-for supplied by a client.
        const ip = process.env.VERCEL
          ? request.headers["x-vercel-forwarded-for"]
          : request.socket.remoteAddress;
        if (typeof ip !== "string" || !ip || ip.length > 100)
          throw new GuestbookError(503, "잠시 후 다시 시도해 주세요.");
        if (body.action === "create") {
          const { action: _, ...submission } = body;
          json(response, 201, await api.create(submission, visitor, ip));
        } else {
          await api.report(body.id, body.reason, visitor, ip);
          json(response, 200, { ok: true });
        }
      } else {
        // Never accept tokens in URLs, where hosting access logs could retain them.
        if ([...url.searchParams.keys()].some((key) => key !== "cursor"))
          throw new GuestbookError(400, "잘못된 요청입니다.");
        const api = getService();
        identity(request, response, api);
        json(
          response,
          200,
          await api.list(url.searchParams.get("cursor") ?? undefined),
        );
      }
    } catch (error) {
      if (error instanceof GuestbookError) {
        if (error.status === 429) response.setHeader("Retry-After", "600");
        json(response, error.status, {
          error: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        });
      } else {
        // Do not log request bodies, credentials, cookies, or deletion tokens.
        json(response, 503, {
          error:
            "발자취를 잠시 이용할 수 없습니다. 잠시 후 다시 시도해 주세요. 설문은 계속 이용할 수 있습니다.",
        });
      }
    }
  };
}
