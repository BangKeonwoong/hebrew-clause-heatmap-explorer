import { state } from "./state.mjs";

export function getScopeKey() {
  if (state.selectedBook === "all") return "all";
  if (state.selectedChapter === "all") return `book:${state.selectedBook}`;
  return `book:${state.selectedBook}|ch:${state.selectedChapter}`;
}

export function getScopeClauses() {
  if (state.selectedBook === "all") return state.clauses;
  if (state.selectedChapter === "all") {
    return state.clausesByBook.get(state.selectedBook) || [];
  }
  const key = `${state.selectedBook}::${Number(state.selectedChapter)}`;
  return state.clausesByBookChapter.get(key) || [];
}

export function getScopeCounts() {
  const scopeKey = getScopeKey();
  const cached = state.scopeCounts.get(scopeKey);
  if (cached) return cached;

  const patternCounts = {};
  const clauseTypeCounts = {};
  for (const r of getScopeClauses()) {
    patternCounts[r.pattern] = (patternCounts[r.pattern] || 0) + 1;
    clauseTypeCounts[r.clause_type] = (clauseTypeCounts[r.clause_type] || 0) + 1;
  }

  const computed = { patternCounts, clauseTypeCounts };
  state.scopeCounts.set(scopeKey, computed);
  return computed;
}

