import { markdownDownloadUrl, markdownFilename } from "./download.js";
import { markdownStateForTab, removeMarkdownState, setMarkdownState } from "./markdown-state.js";
import { pickerResultForTab, removePickerResult, setPickerResult } from "./picker-state.js";
import {
  DOWNLOAD_MARKDOWN,
  GET_MARKDOWN,
  MARKDOWN_STATES_KEY,
  OPEN_EDITOR,
  PICKER_CLEAR,
  PICKER_RESULT,
  PICKER_RESULTS_KEY,
  PICKER_START,
  UPDATE_MARKDOWN
} from "../shared/messages.js";

const EDITOR_WINDOWS_KEY = "page-to-markdown:editor-windows";

async function markdownStates() {
  const stored = await chrome.storage.session.get(MARKDOWN_STATES_KEY);
  return stored[MARKDOWN_STATES_KEY] ?? {};
}

async function updateMarkdownState(tabId, state) {
  if (!Number.isInteger(tabId) || typeof state.markdown !== "string") {
    throw new Error("The editor requires a tab and Markdown content.");
  }

  const states = await markdownStates();
  await chrome.storage.session.set({
    [MARKDOWN_STATES_KEY]: setMarkdownState(states, tabId, {
      markdown: state.markdown,
      ready: true,
      sourceUrl: state.sourceUrl ?? markdownStateForTab(states, tabId)?.sourceUrl ?? ""
    })
  });
}

async function editorWindows() {
  const stored = await chrome.storage.session.get(EDITOR_WINDOWS_KEY);
  return stored[EDITOR_WINDOWS_KEY] ?? {};
}

async function setEditorWindow(tabId, windowId) {
  const windows = await editorWindows();
  await chrome.storage.session.set({
    [EDITOR_WINDOWS_KEY]: {
      ...windows,
      [String(tabId)]: windowId
    }
  });
}

async function removeEditorWindow(windowId) {
  const windows = await editorWindows();
  const entry = Object.entries(windows).find(([, storedWindowId]) => storedWindowId === windowId);
  if (!entry) {
    return;
  }

  const [tabId] = entry;
  const nextWindows = { ...windows };
  delete nextWindows[tabId];
  await chrome.storage.session.set({ [EDITOR_WINDOWS_KEY]: nextWindows });
}

async function openEditor(tabId, state) {
  await updateMarkdownState(tabId, state);
  const windowId = (await editorWindows())[String(tabId)];
  if (Number.isInteger(windowId)) {
    try {
      await chrome.windows.update(windowId, { focused: true });
      return windowId;
    } catch (error) {
      console.info("Page to Markdown is replacing a stale editor window.", error);
      await removeEditorWindow(windowId);
    }
  }

  const editorWindow = await chrome.windows.create({
    focused: true,
    height: 760,
    type: "popup",
    url: `${chrome.runtime.getURL("editor.html")}?tabId=${tabId}`,
    width: 1000
  });
  if (editorWindow.id === undefined) {
    throw new Error("Chrome did not create the editor window.");
  }

  await setEditorWindow(tabId, editorWindow.id);
  return editorWindow.id;
}

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

  if (message?.type === GET_MARKDOWN) {
    markdownStates()
      .then((states) => sendResponse({ ok: true, state: markdownStateForTab(states, message.tabId) }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "Unable to load Markdown.", ok: false }));
    return true;
  }

  if (message?.type === UPDATE_MARKDOWN) {
    updateMarkdownState(message.tabId, message.state)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "Unable to save Markdown.", ok: false }));
    return true;
  }

  if (message?.type === OPEN_EDITOR) {
    openEditor(message.tabId, message.state)
      .then((windowId) => sendResponse({ ok: true, windowId }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "Unable to open the editor.", ok: false }));
    return true;
  }

  return undefined;
});

chrome.windows.onRemoved.addListener((windowId) => {
  removeEditorWindow(windowId).catch((error) => {
    console.error("Page to Markdown could not remove the closed editor window.", error);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  Promise.all([markdownStates(), pickerResults()])
    .then(async ([states, results]) => {
      await chrome.storage.session.set({
        [MARKDOWN_STATES_KEY]: removeMarkdownState(states, tabId),
        [PICKER_RESULTS_KEY]: removePickerResult(results, tabId)
      });
    })
    .catch((error) => {
      console.error("Page to Markdown could not remove closed-tab state.", error);
    });
});
