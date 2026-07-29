import createDOMPurify from "dompurify";
import { marked } from "marked";

export function renderMarkdown(markdown, window) {
  const html = marked.parse(markdown, { async: false, gfm: true });
  return createDOMPurify(window).sanitize(html, { USE_PROFILES: { html: true } });
}
