// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("loads compiled API entry points in native Node ESM", () => {
  const work = join(process.cwd(), "work");
  mkdirSync(work, { recursive: true });
  const output = mkdtempSync(join(work, "api-runtime-"));
  try {
    execFileSync(
      process.execPath,
      [
        join(process.cwd(), "node_modules/typescript/bin/tsc"),
        "--target", "ES2022",
        "--module", "ESNext",
        "--moduleResolution", "Bundler",
        "--skipLibCheck",
        "--types", "node",
        "--rootDir", process.cwd(),
        "--outDir", output,
        "api/guestbook.ts",
        "api/guestbook/cleanup.ts",
        "api/page.ts",
      ],
      { stdio: "pipe" },
    );
    const result = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `
          import assert from "node:assert/strict";
          for (const path of ["./api/guestbook.js", "./api/guestbook/cleanup.js", "./api/page.js"]) {
            const { default: handler } = await import(path);
            const response = { statusCode: 0, setHeader() {}, end() {} };
            await handler({ method: "OPTIONS", headers: {} }, response);
            assert.equal(response.statusCode, 405, path);
          }
          console.log("All API entry points loaded");
        `,
      ],
      { cwd: output, encoding: "utf8", stdio: "pipe" },
    );
    expect(result.trim()).toBe("All API entry points loaded");
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}, 15_000);
