import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const REMOVABLE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "canvas",
  "iframe",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "nav",
  "footer",
  "aside",
  "[aria-hidden='true']",
  "[hidden]"
];

function cleanDocument(document) {
  const clone = document.cloneNode(true);
  clone.querySelectorAll(REMOVABLE_SELECTORS.join(",")).forEach((element) => element.remove());
  return clone;
}

function fallbackContent(document) {
  const candidates = [...document.querySelectorAll("article, main, [role='main']")];
  const bestCandidate = candidates.reduce(
    (best, candidate) =>
      candidate.textContent.trim().length > best.textContent.trim().length ? candidate : best,
    document.body
  );

  return bestCandidate?.innerHTML ?? "";
}

function createTurndownService() {
  const service = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    headingStyle: "atx",
    hr: "---",
    strongDelimiter: "**"
  });

  service.use(gfm);
  service.addRule("removeEmptyLinks", {
    filter: (node) => node.nodeName === "A" && !node.getAttribute("href"),
    replacement: (content) => content
  });
  service.addRule("keepImageAltText", {
    filter: "img",
    replacement: (_content, node) => {
      const alt = node.getAttribute("alt")?.trim();
      const source = node.getAttribute("src");
      return alt && source ? `![${alt}](${source})` : alt ?? "";
    }
  });

  return service;
}

function normalizeMarkdown(markdown) {
  return markdown
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function markdownTitle(title) {
  return title.replace(/[\r\n#]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled page";
}

function composeMarkdown(title, sourceUrl, html) {
  const markdown = normalizeMarkdown(createTurndownService().turndown(html));
  const source = sourceUrl ? `Source: [${sourceUrl}](${sourceUrl})` : "";
  const body = markdown || "_No readable page content was found._";

  return [`# ${markdownTitle(title)}`, source, body].filter(Boolean).join("\n\n");
}

export function createPageMarkdown(document) {
  const cleanedDocument = cleanDocument(document);
  const article = new Readability(cleanedDocument, { charThreshold: 0 }).parse();
  const title = markdownTitle(article?.title ?? document.title);
  const content = article?.content ?? fallbackContent(cleanedDocument);

  return composeMarkdown(title, document.location?.href ?? "", content);
}

export function createSelectedElementMarkdown(element, document) {
  const container = document.createElement("div");
  container.append(element.cloneNode(true));
  container.querySelectorAll(REMOVABLE_SELECTORS.join(",")).forEach((removable) => removable.remove());

  return composeMarkdown(document.title, document.location?.href ?? "", container.innerHTML);
}
