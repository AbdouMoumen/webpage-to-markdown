import assert from "node:assert/strict";
import test from "node:test";
import { markdownDownloadUrl, markdownFilename } from "../src/background/download.js";

test("creates a safe Markdown filename from the document heading", () => {
  assert.equal(markdownFilename("# A title: with punctuation\n\nBody"), "a-title-with-punctuation.md");
  assert.equal(markdownFilename("No heading"), "page.md");
});

test("encodes Markdown in a local download URL", () => {
  assert.equal(
    markdownDownloadUrl("# Heading\n\nA & B"),
    "data:text/markdown;charset=utf-8,%23%20Heading%0A%0AA%20%26%20B"
  );
});
