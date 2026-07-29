import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { renderMarkdown } from "../src/popup/preview.js";

test("renders GFM Markdown and sanitizes unsafe HTML and URLs", () => {
  const window = new JSDOM().window;
  const preview = renderMarkdown("# Heading\n\n- One\n- Two\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))", window);

  assert.match(preview, /<h1>Heading<\/h1>/);
  assert.match(preview, /<li>One<\/li>/);
  assert.doesNotMatch(preview, /script|alert|javascript/);
});
