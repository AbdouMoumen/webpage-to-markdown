import { createSelectedElementMarkdown } from "./markdown.js";
import { PICKER_RESULT } from "../shared/messages.js";

const PICKER_KEY = "__pageToMarkdownPicker";
const PICKER_STYLE_ID = "page-to-markdown-picker-style";
const PICKER_OVERLAY_ID = "page-to-markdown-picker-overlay";

function elementAtPointer(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  return element instanceof Element ? element : null;
}

function createPicker() {
  const style = document.createElement("style");
  style.id = PICKER_STYLE_ID;
  style.textContent = `
    #${PICKER_OVERLAY_ID} {
      background: rgb(83 97 217 / 16%);
      border: 2px solid #5361d9;
      box-sizing: border-box;
      display: none;
      pointer-events: none;
      position: fixed;
      z-index: 2147483647;
    }
  `;

  const overlay = document.createElement("div");
  overlay.id = PICKER_OVERLAY_ID;
  overlay.setAttribute("aria-hidden", "true");
  document.documentElement.append(style, overlay);

  let hoveredElement = null;

  function showOverlay(element) {
    hoveredElement = element;
    const bounds = element.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.height = `${bounds.height}px`;
    overlay.style.left = `${bounds.left}px`;
    overlay.style.top = `${bounds.top}px`;
    overlay.style.width = `${bounds.width}px`;
  }

  function hideOverlay() {
    hoveredElement = null;
    overlay.style.display = "none";
  }

  function cleanup() {
    window.removeEventListener("mousemove", onMouseMove, true);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", onScroll, true);
    overlay.remove();
    style.remove();
    delete globalThis[PICKER_KEY];
  }

  async function report(result) {
    const response = await chrome.runtime.sendMessage({ result, type: PICKER_RESULT });
    if (!response?.ok) {
      throw new Error(response?.error ?? "The picker result could not be saved.");
    }
  }

  async function selectElement(element) {
    try {
      const markdown = createSelectedElementMarkdown(element, document);
      await report({
        markdown,
        sourceUrl: document.location.href,
        state: "selected",
        title: document.title
      });
    } catch (error) {
      try {
        await report({
          message: error instanceof Error ? error.message : "Unable to convert the selected element.",
          state: "error"
        });
      } catch (reportError) {
        console.error("Page to Markdown could not save the picker error.", reportError);
      }
    } finally {
      cleanup();
    }
  }

  function onMouseMove(event) {
    const element = elementAtPointer(event);
    if (element) {
      showOverlay(element);
    } else {
      hideOverlay();
    }
  }

  function onClick(event) {
    const element = elementAtPointer(event);
    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    void selectElement(element);
  }

  function onKeyDown(event) {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    report({ message: "Element picker cancelled.", state: "cancelled" })
      .catch((error) => console.error("Page to Markdown could not save the cancelled picker state.", error))
      .finally(cleanup);
  }

  function onScroll() {
    if (hoveredElement) {
      showOverlay(hoveredElement);
    }
  }

  window.addEventListener("mousemove", onMouseMove, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", onScroll, true);

  return { cleanup };
}

globalThis[PICKER_KEY]?.cleanup();
globalThis[PICKER_KEY] = createPicker();
