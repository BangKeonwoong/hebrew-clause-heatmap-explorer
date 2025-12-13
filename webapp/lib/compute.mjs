import { state } from "./state.mjs";
import { getScopeIndex } from "./scope.mjs";

export function computeAllPatterns() {
  const counts = {};
  for (const book of Object.values(state.statsData)) {
    for (const patternsByType of Object.values(book)) {
      for (const [pat, count] of Object.entries(patternsByType)) {
        counts[pat] = (counts[pat] || 0) + count;
      }
    }
  }
  state.allPatterns = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([pat]) => pat);
}

export function computeAllClauseTypes() {
  const set = new Set();
  for (const book of Object.values(state.statsData)) {
    for (const typ of Object.keys(book)) set.add(typ);
  }
  state.allClauseTypes = Array.from(set).sort((a, b) => a.localeCompare(b));
  state.clauseTypes = state.allClauseTypes.slice();
}

function computeLocalPatternOrder() {
  if (state.selectedBook === "all") return state.allPatterns.slice();

  const { patternCounts } = getScopeIndex();
  const globalRank = Object.fromEntries(state.allPatterns.map((p, i) => [p, i]));
  return state.allPatterns.slice().sort((a, b) => {
    const ca = patternCounts[a] || 0;
    const cb = patternCounts[b] || 0;
    if (cb !== ca) return cb - ca;
    return (globalRank[a] ?? 99999) - (globalRank[b] ?? 99999);
  });
}

function applyPatternLimit(limitValue, orderSource) {
  if (limitValue === "all") return orderSource.slice();
  const limit = Number(limitValue);
  if (!Number.isFinite(limit) || limit <= 0) return orderSource.slice();
  return orderSource.slice(0, limit);
}

export function updatePatternsFromState(limitValue) {
  const baseOrder = state.useLocalPatternOrder
    ? computeLocalPatternOrder()
    : state.allPatterns;
  state.patterns = applyPatternLimit(limitValue || "all", baseOrder);
}

function computeLocalClauseTypeOrder(counts) {
  const globalRank = Object.fromEntries(state.allClauseTypes.map((t, i) => [t, i]));
  return state.allClauseTypes.slice().sort((a, b) => {
    const ca = counts[a] || 0;
    const cb = counts[b] || 0;
    if (cb !== ca) return cb - ca;
    return (globalRank[a] ?? 99999) - (globalRank[b] ?? 99999);
  });
}

export function updateClauseTypesFromState() {
  if (!state.useFrequencyClauseTypeOrder) {
    state.clauseTypes = state.allClauseTypes.slice();
    return;
  }

  const { clauseTypeCounts } = getScopeIndex();
  let ordered = computeLocalClauseTypeOrder(clauseTypeCounts);
  if (state.hideZeroClauseTypes) {
    ordered = ordered.filter((t) => (clauseTypeCounts[t] || 0) > 0);
  }
  state.clauseTypes = ordered;
}

export function computeMatrix() {
  state.matrix = state.clauseTypes.map(() => state.patterns.map(() => 0));

  const { countsByTypePattern } = getScopeIndex();
  for (let i = 0; i < state.clauseTypes.length; i += 1) {
    const type = state.clauseTypes[i];
    const rowCounts = countsByTypePattern.get(type);
    if (!rowCounts) continue;
    const row = state.matrix[i];
    for (let j = 0; j < state.patterns.length; j += 1) {
      row[j] = rowCounts.get(state.patterns[j]) || 0;
    }
  }
}
