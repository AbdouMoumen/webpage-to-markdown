const popup = document.querySelector("#popup");
const closedState = document.querySelector("#closed-state");
const selector = document.querySelector("#selector");
const selectorMessage = document.querySelector("#selector-message");
const pickerStatus = document.querySelector("#picker-status");
const markdown = document.querySelector("#markdown");
const preview = document.querySelector("#preview-panel");
const editorDialog = document.querySelector("#editor-dialog");
const dialogMarkdown = document.querySelector("#dialog-markdown");
const dialogPreview = document.querySelector("#dialog-preview");

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function renderMarkdown(value) {
  const escaped = escapeHtml(value);
  const blocks = escaped.split(/\n{2,}/).map((block) => {
    if (block.startsWith("# ")) return `<h1>${block.slice(2)}</h1>`;
    if (block.startsWith("## ")) return `<h2>${block.slice(3)}</h2>`;
    if (block.startsWith("&gt; ")) return `<blockquote>${block.slice(5)}</blockquote>`;
    if (/^- /m.test(block)) {
      return `<ul>${block.split("\n").filter((line) => line.startsWith("- ")).map((line) => `<li>${line.slice(2)}</li>`).join("")}</ul>`;
    }
    return `<p>${block.replace(/\n/g, "<br>")}</p>`;
  }).join("");

  return blocks
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((https?:\/\/[^ )]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function setMainTab(view) {
  const isEditing = view === "edit";
  const editTab = document.querySelector("#edit-tab");
  const previewTab = document.querySelector("#preview-tab");
  const editPanel = document.querySelector("#edit-panel");

  editTab.classList.toggle("active", isEditing);
  previewTab.classList.toggle("active", !isEditing);
  editTab.setAttribute("aria-selected", String(isEditing));
  previewTab.setAttribute("aria-selected", String(!isEditing));
  editPanel.hidden = !isEditing;
  preview.hidden = isEditing;
  if (!isEditing) preview.innerHTML = renderMarkdown(markdown.value);
}

function downloadMarkdown() {
  const blob = new Blob([markdown.value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "page-to-markdown.md";
  link.click();
  URL.revokeObjectURL(url);

  // Browser extension popups close after triggering a download; this static prototype shows that result.
  window.setTimeout(() => {
    popup.hidden = true;
    closedState.hidden = false;
  }, 150);
}

document.querySelector("#apply-selector").addEventListener("click", () => {
  const value = selector.value.trim() || "whole page";
  pickerStatus.textContent = value === "whole page" ? "Whole page" : "Selector active";
  selectorMessage.textContent = `Prototype selection applied: ${value}.`;
});

document.querySelector("#start-picker").addEventListener("click", () => {
  pickerStatus.textContent = "Picker active";
  selectorMessage.textContent = "Prototype picker: hovering the page would highlight elements; a click would set the selector.";
  document.querySelector("#start-picker").querySelector("small").textContent = "Waiting for an element click (simulated)";
});

document.querySelector("#edit-tab").addEventListener("click", () => {
  setMainTab("edit");
});

document.querySelector("#preview-tab").addEventListener("click", () => {
  setMainTab("preview");
});

document.querySelector("#expand-editor").addEventListener("click", () => {
  dialogMarkdown.value = markdown.value;
  editorDialog.showModal();
});

document.querySelector("#dialog-edit-tab").addEventListener("click", () => {
  document.querySelector("#dialog-edit-tab").classList.add("active");
  document.querySelector("#dialog-preview-tab").classList.remove("active");
  dialogMarkdown.hidden = false;
  dialogPreview.hidden = true;
});

document.querySelector("#dialog-preview-tab").addEventListener("click", () => {
  dialogPreview.innerHTML = renderMarkdown(dialogMarkdown.value);
  document.querySelector("#dialog-preview-tab").classList.add("active");
  document.querySelector("#dialog-edit-tab").classList.remove("active");
  dialogMarkdown.hidden = true;
  dialogPreview.hidden = false;
});

editorDialog.addEventListener("close", () => {
  markdown.value = dialogMarkdown.value;
});

document.querySelector("#download").addEventListener("click", downloadMarkdown);
document.querySelector("#dialog-download").addEventListener("click", () => {
  markdown.value = dialogMarkdown.value;
  editorDialog.close();
  downloadMarkdown();
});

document.querySelector("#reset-prototype").addEventListener("click", () => location.reload());
document.querySelector("#reopen-prototype").addEventListener("click", () => location.reload());
