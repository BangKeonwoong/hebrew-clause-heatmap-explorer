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

export function getScopeIndex() {
  const scopeKey = getScopeKey();
  const cached = state.scopeIndex.get(scopeKey);
  if (cached) return cached;

  const patternCounts = {};
  const clauseTypeCounts = {};
  const countsByTypePattern = new Map(); // type -> Map(pattern -> count)
  const clausesByTypePattern = new Map(); // type -> Map(pattern -> Array<clause>)

  for (const r of getScopeClauses()) {
    patternCounts[r.pattern] = (patternCounts[r.pattern] || 0) + 1;
    clauseTypeCounts[r.clause_type] = (clauseTypeCounts[r.clause_type] || 0) + 1;

    let rowCounts = countsByTypePattern.get(r.clause_type);
    if (!rowCounts) {
      rowCounts = new Map();
      countsByTypePattern.set(r.clause_type, rowCounts);
    }
    rowCounts.set(r.pattern, (rowCounts.get(r.pattern) || 0) + 1);

    let rowClauses = clausesByTypePattern.get(r.clause_type);
    if (!rowClauses) {
      rowClauses = new Map();
      clausesByTypePattern.set(r.clause_type, rowClauses);
    }
    let arr = rowClauses.get(r.pattern);
    if (!arr) {
      arr = [];
      rowClauses.set(r.pattern, arr);
    }
    arr.push(r);
  }

  const computed = {
    patternCounts,
    clauseTypeCounts,
    countsByTypePattern,
    clausesByTypePattern,
  };
  state.scopeIndex.set(scopeKey, computed);
  return computed;
}

export function getScopeCounts() {
  const idx = getScopeIndex();
  return { patternCounts: idx.patternCounts, clauseTypeCounts: idx.clauseTypeCounts };
}
