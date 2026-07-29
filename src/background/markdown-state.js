export function markdownStateForTab(states, tabId) {
  return states?.[String(tabId)] ?? null;
}

export function removeMarkdownState(states, tabId) {
  const nextStates = { ...states };
  delete nextStates[String(tabId)];
  return nextStates;
}

export function setMarkdownState(states, tabId, state) {
  return {
    ...states,
    [String(tabId)]: {
      ...state,
      updatedAt: Date.now()
    }
  };
}
