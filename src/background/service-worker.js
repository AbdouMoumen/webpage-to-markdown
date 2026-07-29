import { markdownDownloadUrl, markdownFilename } from "./download.js";
import { DOWNLOAD_MARKDOWN, PICKER_RESULT, PICKER_RESULT_KEY } from "../shared/messages.js";

async function savePickerResult(message, sender) {
  if (!sender.tab?.id) {
    throw new Error("The picker result did not originate from a browser tab.");
  }

  await chrome.storage.session.set({
    [PICKER_RESULT_KEY]: {
      ...message.result,
      tabId: sender.tab.id,
      updatedAt: Date.now()
    }
  });
}

async function startDownload(markdown) {
  return chrome.downloads.download({
    filename: markdownFilename(markdown),
    saveAs: false,
    url: markdownDownloadUrl(markdown)
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === PICKER_RESULT) {
    savePickerResult(message, sender)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "Unable to save picker result.", ok: false }));
    return true;
  }

  if (message?.type === DOWNLOAD_MARKDOWN) {
    startDownload(message.markdown)
      .then((downloadId) => sendResponse({ downloadId, ok: true }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "Unable to start download.", ok: false }));
    return true;
  }

  return undefined;
});
