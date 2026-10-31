import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { escapeHtml, renderPage } from "../../server/page";
const template = readFileSync("index.html", "utf8");
function documentFor(url: string) {
  return new DOMParser().parseFromString(
    renderPage(template, new URL(url)),
    "text/html",
  );
}
describe("crawler-visible HTML metadata", () => {
  it("returns complete default social metadata with an absolute 800×400 PNG URL", () => {
    const doc = documentFor("https://nice.example/");
    expect(
      doc.querySelector('meta[property="og:image"]')?.getAttribute("content"),
    ).toBe("https://nice.example/og-default.png");
    expect(
      doc
        .querySelector('meta[property="og:image:width"]')
        ?.getAttribute("content"),
    ).toBe("800");
    expect(
      doc
        .querySelector('meta[property="og:image:height"]')
        ?.getAttribute("content"),
    ).toBe("400");
    expect(
      doc.querySelector('meta[name="twitter:card"]')?.getAttribute("content"),
    ).toBe("summary_large_image");
    expect(doc.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(
      doc
        .querySelector('meta[property="og:description"]')
        ?.getAttribute("content"),
    ).not.toContain("은혜");
  });
  it("puts the validated score/name into initial HTML without requiring JavaScript", () => {
    const doc = documentFor(
      "https://nice.example/?score=730&name=아무개&answers=secret",
    );
    expect(doc.title).toContain("아무개님의 신앙활동 점수는 730점!");
    expect(
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    ).toBe(doc.title);
    const url = doc
      .querySelector('meta[property="og:url"]')!
      .getAttribute("content")!;
    expect(new URL(url).searchParams.get("score")).toBe("730");
    expect(url).not.toContain("answers");
    expect(
      doc.querySelector('meta[property="og:image"]')?.getAttribute("content"),
    ).toBe("https://nice.example/og-default.png");
  });
  it("rejects forged malformed scores rather than displaying arbitrary metadata", () => {
    expect(
      documentFor("https://nice.example/?score=999999&name=친구").title,
    ).not.toContain("999999");
    expect(
      documentFor("https://nice.example/?score=730&score=1").title,
    ).not.toContain("730");
  });
  it("cannot inject tags or attributes through names, and escapes every HTML delimiter", () => {
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
    const doc = documentFor(
      "https://nice.example/?score=730&name=%22%3E%3Cscript%3Ealert(1)%3C/script%3E",
    );
    expect(doc.querySelectorAll("script")).toHaveLength(1);
    expect(doc.querySelector("script")?.getAttribute("src")).toBe(
      "/src/main.tsx",
    );
    expect(doc.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(doc.querySelector("[onerror]")).toBeNull();
  });
});
