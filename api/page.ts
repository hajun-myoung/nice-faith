import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { renderPage } from "../server/page.js";
let template: Promise<string> | undefined;
export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    response.statusCode = 405;
    response.end();
    return;
  }
  // Vercel supplies Host for this deployment; do not trust arbitrary forwarded-host headers.
  const host = request.headers.host;
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    response.statusCode = 400;
    response.end("Invalid host");
    return;
  }
  try {
    template ??= readFile(join(process.cwd(), "dist/index.html"), "utf8");
    const url = new URL(request.url ?? "/", `https://${host}`);
    // An origin-form path is required; a URL parameter can never change the origin.
    url.protocol = "https:";
    url.host = host;
    const html = renderPage(await template, url);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.statusCode = 200;
    response.end(request.method === "HEAD" ? undefined : html);
  } catch {
    template = undefined;
    response.statusCode = 500;
    response.end("페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
