import { createPageMarkdown } from "./markdown.js";

const MESSAGE_TYPE = "page-to-markdown:convert";

if (!globalThis.__pageToMarkdownContentScriptInstalled) {
  globalThis.__pageToMarkdownContentScriptInstalled = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== MESSAGE_TYPE) {
      return undefined;
    }

    try {
      sendResponse({
        markdown: createPageMarkdown(document),
        ok: true,
        title: document.title
      });
    } catch (error) {
      sendResponse({
        error: error instanceof Error ? error.message : "Unable to convert this page.",
        ok: false
      });
    }

    return false;
  });
}
