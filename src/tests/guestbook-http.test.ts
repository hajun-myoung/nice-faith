// @vitest-environment node
import {
  describe,
  expect,
  it,
  vi,
  afterEach,
  beforeEach,
  type MockInstance,
} from "vitest";
import { Readable } from "node:stream";
import type { ServerResponse } from "node:http";
import {
  createGuestbookHandler,
  type ApiRequest,
} from "../../server/guestbook/http";
import { GuestbookService } from "../../server/guestbook/service";
import handler from "../../api/guestbook";
const api = new GuestbookService(
  null!,
  "test-secret-at-least-thirty-two-characters",
);
let list: MockInstance<GuestbookService["list"]>,
  create: MockInstance<GuestbookService["create"]>,
  remove: MockInstance<GuestbookService["remove"]>,
  cleanup: MockInstance<GuestbookService["cleanup"]>;
beforeEach(() => {
  list = vi
    .spyOn(api, "list")
    .mockResolvedValue({ entries: [], nextCursor: null });
  create = vi
    .spyOn(api, "create")
    .mockResolvedValue({ id: "entry", token: "secret" });
  remove = vi.spyOn(api, "remove").mockResolvedValue(undefined);
  cleanup = vi
    .spyOn(api, "cleanup")
    .mockResolvedValue({ deleted: 0, moreExpiredMayRemain: false });
});
async function request(
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    url?: string;
    cron?: boolean;
    unconfigured?: boolean;
  } = {},
) {
  const req = Readable.from([]) as ApiRequest;
  req.method = options.method ?? "GET";
  req.url = options.url ?? "/api/guestbook";
  req.headers = {
    host: "example.com",
    origin: "https://example.com",
    "content-type": "application/json",
    ...options.headers,
  };
  Object.defineProperty(req, "socket", {
    value: { remoteAddress: "127.0.0.1" },
  });
  req.body = options.body;
  const headers: Record<string, string> = {};
  let status = 0,
    body = "";
  const res = {
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    set statusCode(value: number) {
      status = value;
    },
    end: (value: string) => {
      body = value;
    },
  } as unknown as ServerResponse;
  await (
    options.unconfigured
      ? handler
      : createGuestbookHandler(() => api, options.cron)
  )(req, res);
  return { status, headers, body: JSON.parse(body) };
}
afterEach(() => vi.unstubAllEnvs());
describe("guestbook HTTP boundary", () => {
  it("disables caches, establishes a signed HttpOnly cookie, and lists only via the service", async () => {
    const result = await request();
    expect(result.status).toBe(200);
    expect(result.headers["Cache-Control"]).toBe("private, no-store");
    expect(result.headers["Referrer-Policy"]).toBe("no-referrer");
    expect(result.headers["Set-Cookie"]).toContain("HttpOnly; SameSite=Strict");
    expect(list).toHaveBeenCalled();
  });
  it("requires an established cookie before writing, so a lost first response cannot lose deletion rights", async () => {
    const options = {
      method: "POST",
      body: { action: "create", requestId: "test", input: {} },
    };
    const first = await request(options);
    expect(first.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
    const cookie = first.headers["Set-Cookie"].split(";")[0];
    const second = await request({ ...options, headers: { cookie } });
    expect(second.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      { requestId: "test", input: {} },
      expect.any(String),
      "127.0.0.1",
    );
  });
  it("rejects cross-origin mutations, unexpected fields, non-JSON, oversized bodies, and URL tokens", async () => {
    expect(
      (
        await request({
          method: "POST",
          headers: { origin: "https://attacker.com" },
          body: { action: "delete" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request({
          method: "POST",
          body: { action: "delete", token: "token", score: 1 },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request({
          method: "POST",
          headers: { "content-type": "text/plain" },
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await request({
          method: "POST",
          body: { action: "delete", token: "x".repeat(9000) },
        })
      ).status,
    ).toBe(413);
    expect((await request({ url: "/api/guestbook?token=secret" })).status).toBe(
      400,
    );
    expect((await request({ method: "PUT" })).status).toBe(405);
    expect(remove).not.toHaveBeenCalled();
  });
  it("only authorizes cleanup with the server cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test-at-least-thirty-two-characters");
    expect((await request({ cron: true })).status).toBe(401);
    expect(cleanup).not.toHaveBeenCalled();
    const result = await request({
      cron: true,
      headers: {
        authorization: "Bearer cron-test-at-least-thirty-two-characters",
      },
    });
    expect(result.status).toBe(200);
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it("fails closed without Firebase settings or in preview and does not expose internal failures", async () => {
    vi.stubEnv(
      "GUESTBOOK_SECRET",
      "test-secret-at-least-thirty-two-characters",
    );
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await request({ unconfigured: true })).status).toBe(503);
    list.mockRejectedValueOnce(new Error("PRIVATE KEY CONTENT"));
    const result = await request();
    expect(result.status).toBe(503);
    expect(result.body.error).not.toContain("PRIVATE KEY");
  });
});
