export function markdownStateForTab(states, tabId) {
  return states?.[String(tabId)] ?? null;
}

export function isMarkdownStateReady(state) {
  return state?.ready === true && typeof state.markdown === "string";
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
      ready: true,
      updatedAt: Date.now()
    }
  };
}
