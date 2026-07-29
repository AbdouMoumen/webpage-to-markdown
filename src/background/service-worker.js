import { markdownDownloadUrl, markdownFilename } from "./download.js";
import { pickerResultForTab, removePickerResult, setPickerResult } from "./picker-state.js";
import {
  DOWNLOAD_MARKDOWN,
  PICKER_CLEAR,
  PICKER_RESULT,
  PICKER_RESULTS_KEY,
  PICKER_START
} from "../shared/messages.js";

async function pickerResults() {
  const stored = await chrome.storage.session.get(PICKER_RESULTS_KEY);
  return stored[PICKER_RESULTS_KEY] ?? {};
}

async function updatePickerResult(tabId, result) {
  const results = await pickerResults();
  await chrome.storage.session.set({
    [PICKER_RESULTS_KEY]: setPickerResult(results, tabId, result)
  });
}

async function clearPickerResult(tabId) {
  const results = await pickerResults();
  if (!pickerResultForTab(results, tabId)) {
    return;
  }

  await chrome.storage.session.set({
    [PICKER_RESULTS_KEY]: removePickerResult(results, tabId)
  });
}

async function startPicker(tabId) {
  if (!Number.isInteger(tabId)) {
    throw new Error("The picker requires a valid browser tab.");
  }

  await updatePickerResult(tabId, {
    message: "Element picker is active. Click an element or press Escape to cancel.",
    state: "picking"
  });
}

async function savePickerResult(message, sender) {
  if (!sender.tab?.id) {
    throw new Error("The picker result did not originate from a browser tab.");
  }

  await updatePickerResult(sender.tab.id, message.result);
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

  if (message?.type === PICKER_START) {
    startPicker(message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "Unable to start the picker.", ok: false }));
    return true;
  }

  if (message?.type === PICKER_CLEAR) {
    clearPickerResult(message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "Unable to clear picker state.", ok: false }));
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
