const MESSAGE_TYPE = "page-to-markdown:convert";

const elements = {
  convert: document.querySelector("#convert"),
  copy: document.querySelector("#copy"),
  download: document.querySelector("#download"),
  markdown: document.querySelector("#markdown"),
  status: document.querySelector("#status")
};

function setStatus(message, state = "loading") {
  elements.status.textContent = message;
  elements.status.dataset.state = state;
}

function setOutput(markdown) {
  elements.markdown.value = markdown;
  elements.markdown.disabled = false;
  elements.copy.disabled = false;
  elements.download.disabled = false;
}

function setLoading(isLoading) {
  elements.convert.disabled = isLoading;
  if (isLoading) {
    elements.copy.disabled = true;
    elements.download.disabled = true;
  }
}

async function convertCurrentPage() {
  setLoading(true);
  elements.markdown.disabled = true;
  setStatus("Converting the current page...");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error("No active tab was found.");
    }

    await chrome.scripting.executeScript({
      files: ["converter.js"],
      target: { tabId: tab.id }
    });

    const result = await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPE });
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

function markdownFilename() {
  const title = elements.markdown.value.match(/^#\s+(.+)$/m)?.[1] ?? "page";
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return `${safeTitle || "page"}.md`;
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(elements.markdown.value);
    setStatus("Markdown copied to your clipboard.", "success");
  } catch (error) {
    setStatus(
      `Copy failed: ${error instanceof Error ? error.message : "Clipboard access was unavailable."}`,
      "error"
    );
  }
}

function downloadMarkdown() {
  const blob = new Blob([elements.markdown.value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = markdownFilename();
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`Downloaded ${link.download}.`, "success");
}

elements.convert.addEventListener("click", convertCurrentPage);
elements.copy.addEventListener("click", copyMarkdown);
elements.download.addEventListener("click", downloadMarkdown);

void convertCurrentPage();
