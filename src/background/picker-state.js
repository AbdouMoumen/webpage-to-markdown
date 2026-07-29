export function pickerResultForTab(results, tabId) {
  return results?.[String(tabId)] ?? null;
}

export function removePickerResult(results, tabId) {
  const nextResults = { ...results };
  delete nextResults[String(tabId)];
  return nextResults;
}

export function setPickerResult(results, tabId, result) {
  return {
    ...results,
    [String(tabId)]: {
      ...result,
      updatedAt: Date.now()
    }
  };
}
