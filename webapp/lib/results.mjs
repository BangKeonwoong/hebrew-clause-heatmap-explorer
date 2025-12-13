import { dom } from "./dom.mjs";
import { PAGE_SIZE, state } from "./state.mjs";
import { setSelectionInfo } from "./utils.mjs";
import { getScopeIndex } from "./scope.mjs";

export function selectionStatusText() {
  if (state.selectedCells.length === 0) return "셀을 선택하세요.";
  if (state.selectedCells.length === 1) {
    const c = state.selectedCells[0];
    return `선택: ${c.clauseType} × ${c.pattern}`;
  }
  return `선택된 셀 ${state.selectedCells.length}개`;
}

export function toggleCellSelection({ clauseType, pattern }, isShift) {
  if (!isShift) state.selectedCells = [];

  const key = `${clauseType}||${pattern}`;
  const exists = state.selectedCells.some(
    (c) => `${c.clauseType}||${c.pattern}` === key
  );

  if (exists) {
    state.selectedCells = state.selectedCells.filter(
      (c) => `${c.clauseType}||${c.pattern}` !== key
    );
  } else {
    state.selectedCells.push({ clauseType, pattern });
  }
}

function filterClauses() {
  if (state.selectedCells.length === 0) return [];

  const { clausesByTypePattern } = getScopeIndex();
  const filtered = [];
  for (const c of state.selectedCells) {
    const byType = clausesByTypePattern.get(c.clauseType);
    if (!byType) continue;
    const arr = byType.get(c.pattern);
    if (!arr || arr.length === 0) continue;
    filtered.push(...arr);
  }

  filtered.sort((a, b) => {
    const bi = (state.bookIndex[a.book] ?? 999) - (state.bookIndex[b.book] ?? 999);
    if (bi !== 0) return bi;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    if (a.verse !== b.verse) return a.verse - b.verse;
    return a.node - b.node;
  });

  return filtered;
}

export function renderResults(reset) {
  if (reset) {
    dom.results.innerHTML = "";
    state.displayedCount = 0;
  }

  const slice = state.currentResults.slice(
    state.displayedCount,
    state.displayedCount + PAGE_SIZE
  );

  for (const r of slice) {
    const item = document.createElement("div");
    item.className = "result-item";

    const ref = document.createElement("div");
    ref.className = "result-ref";
    ref.textContent = `${r.book} ${r.chapter}:${r.verse} · ${r.clause_type} · ${r.pattern}`;

    const text = document.createElement("div");
    text.textContent = r.hebrew;

    item.appendChild(ref);
    item.appendChild(text);
    dom.results.appendChild(item);
  }

  state.displayedCount += slice.length;
  dom.loadMore.hidden = state.displayedCount >= state.currentResults.length;
}

export function renderSelectionAndResults(reset) {
  if (state.selectedCells.length === 0) {
    setSelectionInfo(selectionStatusText());
    dom.results.innerHTML = "";
    dom.loadMore.hidden = true;
    return;
  }

  state.currentResults = filterClauses();

  const cellLabel =
    state.selectedCells.length === 1
      ? `${state.selectedCells[0].clauseType} × ${state.selectedCells[0].pattern}`
      : `선택된 셀 ${state.selectedCells.length}개`;
  setSelectionInfo(`${cellLabel} · ${state.currentResults.length}개 절`);

  renderResults(reset);
}

export function clearSelectionAndPanel() {
  state.selectedCells = [];
  state.currentResults = [];
  state.displayedCount = 0;
  setSelectionInfo(selectionStatusText());
  dom.results.innerHTML = "";
  dom.loadMore.hidden = true;
}
