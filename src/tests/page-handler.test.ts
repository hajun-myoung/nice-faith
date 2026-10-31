import { describe, expect, it, vi, beforeEach } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readFile, default: { ...actual, readFile } };
});
beforeEach(() => {
  vi.resetModules();
  readFile.mockReset();
  readFile.mockResolvedValue(
    "<html><head><!--social-meta:start--><!--social-meta:end--></head><body>app</body></html>",
  );
});
async function invoke(
  method = "GET",
  url = "/?score=730&name=친구",
  host = "nice.example",
) {
  const { default: handler } = await import("../../api/page");
  const headers = new Map<string, string>();
  const end = vi.fn();
  const response = {
    statusCode: 0,
    setHeader: (key: string, value: string) => headers.set(key, value),
    end,
  };
  await handler(
    { method, url, headers: { host } } as IncomingMessage,
    response as unknown as ServerResponse,
  );
  return { status: response.statusCode, headers, end };
}
describe("Vercel HTML function", () => {
  it("serves the built entry point with score metadata and no cross-request cache", async () => {
    const result = await invoke();
    expect(result.status).toBe(200);
    expect(result.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect(result.end.mock.calls[0][0]).toContain(
      "친구님의 신앙활동 점수는 730점!",
    );
    expect(result.end.mock.calls[0][0]).toContain(
      "https://nice.example/og-default.png",
    );
    expect(readFile.mock.calls[0][0]).toMatch(/dist\/index.html$/);
  });
  it("returns headers but no HTML for HEAD requests", async () => {
    const result = await invoke("HEAD");
    expect(result.status).toBe(200);
    expect(result.end).toHaveBeenCalledWith(undefined);
  });
  it("rejects unsupported methods before reading any files", async () => {
    const result = await invoke("POST");
    expect(result.status).toBe(405);
    expect(result.headers.get("Allow")).toBe("GET, HEAD");
    expect(readFile).not.toHaveBeenCalled();
  });
  it("rejects host header injection", async () => {
    const result = await invoke("GET", "/", 'nice.example\"/><script>');
    expect(result.status).toBe(400);
    expect(readFile).not.toHaveBeenCalled();
  });
  it("does not allow an absolute request target to replace the deployment origin", async () => {
    const result = await invoke("GET", "https://attacker.example/?score=730");
    expect(result.end.mock.calls[0][0]).not.toContain("attacker.example");
  });
  it("reports a missing build without leaking paths and can recover on retry", async () => {
    readFile.mockRejectedValueOnce(new Error("secret server path"));
    const failed = await invoke();
    expect(failed.status).toBe(500);
    expect(failed.end.mock.calls[0][0]).not.toContain("secret");
    expect((await invoke()).status).toBe(200);
  });
});
