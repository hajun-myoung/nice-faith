import { readFile } from "node:fs/promises";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import solid from "vite-plugin-solid";
import tailwind from "@tailwindcss/vite";
import { createGuestbookHandler } from "./server/guestbook/http";
import { renderPage } from "./server/page";
// Local dev/preview mirrors the server-rendered metadata returned by the Vercel Function.
const socialMetadata: Plugin = {
  name: "social-metadata",
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if ((request.url ?? "").split("?")[0] === "/api/guestbook") {
        await createGuestbookHandler()(request, response);
        return;
      }
      if (!["/", "/index.html"].includes((request.url ?? "").split("?")[0]))
        return next();
      try {
        const source = await readFile("index.html", "utf8");
        const html = await server.transformIndexHtml(request.url!, source);
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.end(
          renderPage(
            html,
            new URL(request.url!, `http://${request.headers.host}`),
          ),
        );
      } catch (error) {
        next(error);
      }
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if ((request.url ?? "").split("?")[0] === "/api/guestbook") {
        await createGuestbookHandler()(request, response);
        return;
      }
      if (!["/", "/index.html"].includes((request.url ?? "").split("?")[0]))
        return next();
      try {
        const html = await readFile("dist/index.html", "utf8");
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.end(
          renderPage(
            html,
            new URL(request.url!, `http://${request.headers.host}`),
          ),
        );
      } catch (error) {
        next(error);
      }
    });
  },
};
export default defineConfig({
  plugins: [solid(), tailwind(), socialMetadata],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    clearMocks: true,
  },
});
