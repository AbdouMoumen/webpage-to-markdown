import assert from "node:assert/strict";
import test from "node:test";
import { pickerResultForTab, removePickerResult, setPickerResult } from "../src/background/picker-state.js";

test("stores picker results independently for each browser tab", () => {
  const first = setPickerResult({}, 101, { markdown: "# First", state: "selected" });
  const results = setPickerResult(first, 202, { markdown: "# Second", state: "selected" });

  assert.equal(pickerResultForTab(results, 101).markdown, "# First");
  assert.equal(pickerResultForTab(results, 202).markdown, "# Second");
});

test("clearing one tab leaves other picker results intact", () => {
  const results = {
    101: { state: "cancelled" },
    202: { markdown: "# Second", state: "selected" }
  };

  const cleared = removePickerResult(results, 101);

  assert.equal(pickerResultForTab(cleared, 101), null);
  assert.equal(pickerResultForTab(cleared, 202).markdown, "# Second");
});

test("a selected result replaces only the pending result for its tab", () => {
  const picking = setPickerResult({}, 101, { state: "picking" });
  const selected = setPickerResult(picking, 101, { markdown: "# Selected", state: "selected" });

  assert.equal(pickerResultForTab(selected, 101).state, "selected");
  assert.equal(pickerResultForTab(selected, 101).markdown, "# Selected");
});
