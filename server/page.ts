import {
  parseSharedResult,
  resultShareUrl,
  resultTitle,
  siteDescription,
} from "../src/domain/sharing.js";
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}
export function renderPage(template: string, url: URL): string {
  const result = parseSharedResult(url.search);
  const title = result
    ? `${resultTitle(result)} | NICE FAITH`
    : "NICE FAITH — 당신의 믿음, 몇 점입니까?";
  const description = result
    ? "나는 몇 점일까? 12개의 질문으로 나의 신앙활동도 확인해 보세요."
    : siteDescription;
  const canonical = result
    ? resultShareUrl(url.href, result)
    : `${url.origin}/`;
  const image = `${url.origin}/og-default.png`;
  const meta = `<!--social-meta:start-->
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<meta property="og:type" content="website"/>
<meta property="og:locale" content="ko_KR"/>
<meta property="og:site_name" content="NICE FAITH"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:url" content="${escapeHtml(canonical)}"/>
<meta property="og:image" content="${escapeHtml(image)}"/>
<meta property="og:image:type" content="image/png"/>
<meta property="og:image:width" content="800"/>
<meta property="og:image:height" content="400"/>
<meta property="og:image:alt" content="당신의 믿음, 몇 점입니까? NICE FAITH"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escapeHtml(title)}"/>
<meta name="twitter:description" content="${escapeHtml(description)}"/>
<meta name="twitter:image" content="${escapeHtml(image)}"/>
<link rel="canonical" href="${escapeHtml(canonical)}"/>
<!--social-meta:end-->`;
  return template.replace(
    /<!--social-meta:start-->[\s\S]*?<!--social-meta:end-->/,
    () => meta,
  );
}
