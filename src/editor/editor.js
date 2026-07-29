import { DOWNLOAD_MARKDOWN, GET_MARKDOWN, MARKDOWN_STATES_KEY, UPDATE_MARKDOWN } from "../shared/messages.js";
import { renderMarkdown } from "../popup/preview.js";

const tabId = Number(new URLSearchParams(location.search).get("tabId"));
const elements = {
  close: document.querySelector("#close"),
  copy: document.querySelector("#copy"),
  download: document.querySelector("#download"),
  editPanel: document.querySelector("#edit-panel"),
  editTab: document.querySelector("#edit-tab"),
  markdown: document.querySelector("#markdown"),
  preview: document.querySelector("#preview-panel"),
  previewTab: document.querySelector("#preview-tab"),
  status: document.querySelector("#status")
};

let sourceUrl = "";
let saveTimer;
let loadingTimer;

function setStatus(message, state = "loading") {
  elements.status.textContent = message;
  elements.status.dataset.state = state;
}

function stateForTab(states) {
  return states?.[String(tabId)] ?? null;
}

function applyMarkdownState(state, message) {
  if (!state?.ready || typeof state.markdown !== "string") {
    return false;
  }

  window.clearTimeout(loadingTimer);
  elements.markdown.disabled = false;
  elements.markdown.value = state.markdown;
  sourceUrl = state.sourceUrl;
  if (!elements.preview.hidden) {
    elements.preview.innerHTML = renderMarkdown(state.markdown, window);
  }
  setStatus(message, "success");
  return true;
}

function setTab(view) {
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

async function saveMarkdown() {
  window.clearTimeout(saveTimer);
  const result = await chrome.runtime.sendMessage({
    state: { markdown: elements.markdown.value, sourceUrl },
    tabId,
    type: UPDATE_MARKDOWN
  });
  if (!result?.ok) {
    throw new Error(result?.error ?? "Unable to save Markdown.");
  }

  setStatus("Changes saved.", "success");
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveMarkdown().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Unable to save Markdown.", "error");
    });
  }, 350);
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(elements.markdown.value);
    setStatus("Markdown copied to the clipboard.", "success");
  } catch {
    elements.markdown.focus();
    elements.markdown.select();
    setStatus(
      document.execCommand("copy") ? "Markdown copied to the clipboard." : "Clipboard access was unavailable. Select the Markdown and copy it manually.",
      "error"
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

  setStatus("Download started.", "success");
}

async function loadEditor() {
  elements.markdown.disabled = true;
  if (!Number.isInteger(tabId)) {
    setStatus("This editor window is missing its source tab.", "error");
    elements.markdown.disabled = true;
    return;
  }

  const result = await chrome.runtime.sendMessage({ tabId, type: GET_MARKDOWN });
  if (!result?.ok) {
    setStatus(result.error ?? "No Markdown is available for this tab.", "error");
    return;
  }

  if (applyMarkdownState(result.state, "Ready to edit.")) {
    return;
  }

  setStatus("Waiting for the page conversion to finish...");
  loadingTimer = window.setTimeout(() => {
    if (elements.markdown.disabled) {
      setStatus("Markdown did not arrive. Return to the popup and convert the page again.", "error");
    }
  }, 5000);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "session" || !changes[MARKDOWN_STATES_KEY]) {
    return;
  }

  const state = stateForTab(changes[MARKDOWN_STATES_KEY].newValue);
  if (!state?.ready || state.markdown === elements.markdown.value) {
    return;
  }

  applyMarkdownState(state, "Markdown updated from the popup.");
});

elements.editTab.addEventListener("click", () => setTab("edit"));
elements.previewTab.addEventListener("click", () => setTab("preview"));
elements.markdown.addEventListener("input", () => {
  if (!elements.preview.hidden) {
    elements.preview.innerHTML = renderMarkdown(elements.markdown.value, window);
  }
  scheduleSave();
});
elements.copy.addEventListener("click", () => void copyMarkdown());
elements.download.addEventListener("click", () => {
  downloadMarkdown().catch((error) => {
    setStatus(error instanceof Error ? error.message : "The download could not be started.", "error");
  });
});
elements.close.addEventListener("click", () => window.close());
window.addEventListener("pagehide", () => {
  if (saveTimer) {
    void saveMarkdown();
  }
});

void loadEditor();
