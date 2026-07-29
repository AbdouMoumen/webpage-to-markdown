import {
  DOWNLOAD_MARKDOWN,
  GET_MARKDOWN,
  MARKDOWN_STATES_KEY,
  OPEN_EDITOR,
  PICKER_CLEAR,
  PICKER_RESULTS_KEY,
  PICKER_START,
  UPDATE_MARKDOWN
} from "../shared/messages.js";
import { renderMarkdown } from "./preview.js";

const CONVERT_MESSAGE = "page-to-markdown:convert";
const PICKER_RESTRICTED_URL = /^(?:about|chrome|chrome-extension|devtools|edge):/;
const WEB_STORE_URL = /^https:\/\/chromewebstore\.google\.com\//;

const elements = {
  activityStatus: document.querySelector("#activity-status"),
  convert: document.querySelector("#convert"),
  copy: document.querySelector("#copy"),
  download: document.querySelector("#download"),
  editPanel: document.querySelector("#edit-panel"),
  editTab: document.querySelector("#edit-tab"),
  expand: document.querySelector("#expand-editor"),
  markdown: document.querySelector("#markdown"),
  pickElement: document.querySelector("#pick-element"),
  preview: document.querySelector("#preview-panel"),
  previewTab: document.querySelector("#preview-tab"),
  status: document.querySelector("#status")
};

let activeTab;
let saveTimer;
const statusTimeouts = new Map();

function setStatus(message, state = "loading") {
  elements.status.textContent = message;
  elements.status.dataset.state = state;
}

function showActivity(element, message) {
  window.clearTimeout(statusTimeouts.get(element));
  element.textContent = message;
  element.hidden = false;
  statusTimeouts.set(element, window.setTimeout(() => {
    element.hidden = true;
  }, 2400));
}

function tabMarkdownState(states) {
  return states?.[String(activeTab.id)] ?? null;
}

async function saveMarkdown(markdown = elements.markdown.value) {
  const result = await chrome.runtime.sendMessage({
    state: { markdown, sourceUrl: activeTab.url ?? "" },
    tabId: activeTab.id,
    type: UPDATE_MARKDOWN
  });
  if (!result?.ok) {
    throw new Error(result?.error ?? "Unable to save Markdown.");
  }
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveMarkdown().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Unable to save Markdown.", "error");
    });
  }, 350);
}

function setOutput(markdown, persist = true) {
  elements.markdown.value = markdown;
  elements.markdown.disabled = false;
  elements.copy.disabled = false;
  elements.download.disabled = false;
  if (persist) {
    void saveMarkdown(markdown).catch((error) => {
      setStatus(error instanceof Error ? error.message : "Unable to save Markdown.", "error");
    });
  }
}

function setLoading(isLoading) {
  elements.convert.disabled = isLoading;
  elements.expand.disabled = isLoading;
  elements.pickElement.disabled = isLoading;
  if (isLoading) {
    elements.copy.disabled = true;
    elements.download.disabled = true;
  }
}

function setMainTab(view) {
  const isEditing = view === "edit";
  elements.editTab.classList.toggle("active", isEditing);
  elements.previewTab.classList.toggle("active", !isEditing);
  elements.editTab.setAttribute("aria-selected", String(isEditing));
  elements.previewTab.setAttribute("aria-selected", String(!isEditing));
  elements.editPanel.hidden = !isEditing;
  elements.preview.hidden = isEditing;

  if (!isEditing) {
    elements.preview.innerHTML = renderMarkdown(elements.markdown.value, window);
  }
}

function isRestrictedPage(tab) {
  return !tab.url || PICKER_RESTRICTED_URL.test(tab.url) || WEB_STORE_URL.test(tab.url);
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab was found.");
  }

  return tab;
}

function applyPickerResult(result) {
  if (!result) {
    return "none";
  }

  if (result.state === "selected") {
    setOutput(result.markdown);
    setStatus("Selected element converted. Edit, copy, or download the Markdown.", "success");
    return "selected";
  }

  if (result.state === "picking") {
    setStatus(result.message, "loading");
    return "picking";
  }

  setStatus(
    result.message ?? (result.state === "cancelled" ? "Element picker cancelled." : "The selected element could not be converted."),
    result.state === "cancelled" ? "loading" : "error"
  );
  return result.state;
}

async function clearPickerResultForActiveTab() {
  const result = await chrome.runtime.sendMessage({
    tabId: activeTab.id,
    type: PICKER_CLEAR
  });
  if (!result?.ok) {
    throw new Error(result?.error ?? "Unable to clear the picker state.");
  }
}

async function convertCurrentPage() {
  setLoading(true);
  elements.markdown.disabled = true;
  setStatus("Converting the current page...");

  try {
    await clearPickerResultForActiveTab();
    await chrome.scripting.executeScript({
      files: ["converter.js"],
      target: { tabId: activeTab.id }
    });

    const result = await chrome.tabs.sendMessage(activeTab.id, { type: CONVERT_MESSAGE });
    if (!result?.ok) {
      throw new Error(result?.error ?? "The page could not be converted.");
    }

    setOutput(result.markdown);
    setStatus("Conversion complete. Edit the Markdown before copying or downloading.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "The page could not be converted.";
    setStatus(`Could not convert this page: ${message}`, "error");
  } finally {
    setLoading(false);
    if (!elements.markdown.value) {
      elements.markdown.disabled = true;
    }
  }
}

async function startPicker() {
  if (isRestrictedPage(activeTab)) {
    setStatus("Element picking is unavailable on this browser page.", "error");
    return;
  }

  elements.pickElement.disabled = true;
  setStatus("Choose an element on the page. Press Escape to cancel.", "loading");

  try {
    const startResult = await chrome.runtime.sendMessage({
      tabId: activeTab.id,
      type: PICKER_START
    });
    if (!startResult?.ok) {
      throw new Error(startResult?.error ?? "The picker could not be prepared.");
    }

    await chrome.scripting.executeScript({
      files: ["picker.js"],
      target: { tabId: activeTab.id }
    });
    window.close();
  } catch (error) {
    try {
      await clearPickerResultForActiveTab();
    } catch (clearError) {
      console.error("Page to Markdown could not clear the failed picker state.", clearError);
    }
    const message = error instanceof Error ? error.message : "The picker could not start.";
    setStatus(`Could not start the element picker: ${message}`, "error");
    elements.pickElement.disabled = false;
  }
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(elements.markdown.value);
    showActivity(elements.activityStatus, "Markdown copied to the clipboard.");
  } catch {
    elements.markdown.focus();
    elements.markdown.select();
    showActivity(
      elements.activityStatus,
      document.execCommand("copy") ? "Markdown copied to the clipboard." : "Clipboard access was unavailable. Select the Markdown and copy it manually."
    );
  }
}

async function downloadMarkdown() {
  const result = await chrome.runtime.sendMessage({
    markdown: elements.markdown.value,
    type: DOWNLOAD_MARKDOWN
  });

  if (!result?.ok) {
    throw new Error(result?.error ?? "The download could not be started.");
  }

  window.close();
}

async function openEditor() {
  const result = await chrome.runtime.sendMessage({
    state: { markdown: elements.markdown.value, sourceUrl: activeTab.url ?? "" },
    tabId: activeTab.id,
    type: OPEN_EDITOR
  });
  if (!result?.ok) {
    throw new Error(result?.error ?? "The editor could not be opened.");
  }
}

async function loadPickerResult() {
  const stored = await chrome.storage.session.get(PICKER_RESULTS_KEY);
  return applyPickerResult(tabMarkdownState(stored[PICKER_RESULTS_KEY]));
}

async function loadSavedMarkdown() {
  const result = await chrome.runtime.sendMessage({ tabId: activeTab.id, type: GET_MARKDOWN });
  if (!result?.ok || !result.state || result.state.sourceUrl !== activeTab.url) {
    return false;
  }

  setOutput(result.state.markdown, false);
  setStatus("Restored Markdown for this tab.", "success");
  return true;
}

async function initialize() {
  setLoading(true);
  try {
    activeTab = await currentTab();
    const pickerState = await loadPickerResult();
    if (pickerState === "none") {
      const restored = await loadSavedMarkdown();
      if (!restored) {
        await convertCurrentPage();
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "The current page could not be prepared.";
    setStatus(`Could not prepare this page: ${message}`, "error");
  } finally {
    setLoading(false);
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "session" || !activeTab) {
    return;
  }

  if (changes[PICKER_RESULTS_KEY]) {
    applyPickerResult(tabMarkdownState(changes[PICKER_RESULTS_KEY].newValue));
  }

  if (changes[MARKDOWN_STATES_KEY]) {
    const state = tabMarkdownState(changes[MARKDOWN_STATES_KEY].newValue);
    if (state && state.sourceUrl === activeTab.url && state.markdown !== elements.markdown.value) {
      setOutput(state.markdown, false);
      setStatus("Markdown updated from the editor.", "success");
    }
  }
});

elements.convert.addEventListener("click", () => void convertCurrentPage());
elements.pickElement.addEventListener("click", () => void startPicker());
elements.copy.addEventListener("click", () => void copyMarkdown());
elements.download.addEventListener("click", () => {
  downloadMarkdown().catch((error) => {
    const message = error instanceof Error ? error.message : "The download could not be started.";
    setStatus(`Could not start download: ${message}`, "error");
  });
});
elements.editTab.addEventListener("click", () => setMainTab("edit"));
elements.previewTab.addEventListener("click", () => setMainTab("preview"));
elements.markdown.addEventListener("input", () => {
  if (!elements.preview.hidden) {
    elements.preview.innerHTML = renderMarkdown(elements.markdown.value, window);
  }
  scheduleSave();
});
elements.expand.addEventListener("click", () => {
  openEditor().catch((error) => {
    setStatus(error instanceof Error ? error.message : "The editor could not be opened.", "error");
  });
});

void initialize();
