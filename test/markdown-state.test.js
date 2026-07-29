import assert from "node:assert/strict";
import test from "node:test";
import { markdownStateForTab, removeMarkdownState, setMarkdownState } from "../src/background/markdown-state.js";

test("stores Markdown independently for each tab", () => {
  const first = setMarkdownState({}, 101, { markdown: "# First", sourceUrl: "https://example.com/first" });
  const states = setMarkdownState(first, 202, { markdown: "# Second", sourceUrl: "https://example.com/second" });

  assert.equal(markdownStateForTab(states, 101).markdown, "# First");
  assert.equal(markdownStateForTab(states, 202).sourceUrl, "https://example.com/second");
});

test("removing closed-tab Markdown preserves other editor state", () => {
  const states = {
    101: { markdown: "# First", sourceUrl: "https://example.com/first" },
    202: { markdown: "# Second", sourceUrl: "https://example.com/second" }
  };

  const remaining = removeMarkdownState(states, 101);

  assert.equal(markdownStateForTab(remaining, 101), null);
  assert.equal(markdownStateForTab(remaining, 202).markdown, "# Second");
});
