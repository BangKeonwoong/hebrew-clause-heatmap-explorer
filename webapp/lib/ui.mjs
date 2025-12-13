import { dom } from "./dom.mjs";
import { state } from "./state.mjs";
import { displayBookName, setSelectionInfo } from "./utils.mjs";
import {
  computeMatrix,
  updateClauseTypesFromState,
  updatePatternsFromState,
} from "./compute.mjs";
import { clearSelectionAndPanel, selectionStatusText, toggleCellSelection, renderSelectionAndResults, renderResults } from "./results.mjs";
import { renderHeatmap } from "./plot.mjs";

export function populateBooks() {
  for (const b of state.books) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = displayBookName(b);
    dom.bookSelect.appendChild(opt);
  }
}

function populateChapters(book) {
  dom.chapterSelect.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "전체";
  dom.chapterSelect.appendChild(allOpt);

  const chs = state.chaptersByBook[book] || [];
  for (const ch of chs) {
    const opt = document.createElement("option");
    opt.value = String(ch);
    opt.textContent = String(ch);
    dom.chapterSelect.appendChild(opt);
  }
}

function syncChapterSelectForBook() {
  if (state.selectedBook === "all") {
    dom.chapterSelect.disabled = true;
    dom.chapterSelect.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "전체";
    dom.chapterSelect.appendChild(allOpt);
    dom.chapterSelect.value = "all";
    return;
  }

  dom.chapterSelect.disabled = false;
  populateChapters(state.selectedBook);
  dom.chapterSelect.value = "all";
}

export function recomputeAndRender({ clearSelection } = { clearSelection: true }) {
  if (clearSelection) clearSelectionAndPanel();
  updatePatternsFromState(dom.patternLimit?.value || "all");
  updateClauseTypesFromState();
  computeMatrix();
  renderHeatmap({ onClick: handlePlotClick });
}

function handlePlotClick(ev) {
  if (!ev.points || ev.points.length === 0) return;
  const pt = ev.points[0];
  const clauseType = pt.y;
  const pattern = pt.x;
  if (clauseType === "Σ" || pattern === "Σ") return;

  toggleCellSelection(
    { clauseType, pattern },
    Boolean(ev.event && ev.event.shiftKey)
  );
  renderSelectionAndResults(true);
}

export function bindEvents() {
  dom.bookSelect.addEventListener("change", () => {
    state.selectedBook = dom.bookSelect.value;
    state.selectedChapter = "all";
    syncChapterSelectForBook();
    recomputeAndRender({ clearSelection: true });
  });

  dom.chapterSelect.addEventListener("change", () => {
    state.selectedChapter = dom.chapterSelect.value;
    recomputeAndRender({ clearSelection: true });
  });

  dom.patternLimit.addEventListener("change", () => {
    recomputeAndRender({ clearSelection: true });
  });

  dom.localOrderToggle.addEventListener("change", () => {
    state.useLocalPatternOrder = dom.localOrderToggle.checked;
    recomputeAndRender({ clearSelection: true });
  });

  dom.clauseTypeOrderToggle.addEventListener("change", () => {
    state.useFrequencyClauseTypeOrder = dom.clauseTypeOrderToggle.checked;
    dom.hideZeroClauseTypesToggle.disabled = !state.useFrequencyClauseTypeOrder;
    if (!state.useFrequencyClauseTypeOrder) {
      state.hideZeroClauseTypes = false;
      dom.hideZeroClauseTypesToggle.checked = false;
    }
    recomputeAndRender({ clearSelection: true });
  });

  dom.hideZeroClauseTypesToggle.addEventListener("change", () => {
    state.hideZeroClauseTypes = dom.hideZeroClauseTypesToggle.checked;
    recomputeAndRender({ clearSelection: true });
  });

  dom.clearSelection.addEventListener("click", () => {
    clearSelectionAndPanel();
  });

  dom.loadMore.addEventListener("click", () => {
    renderResults(false);
  });

  setSelectionInfo(selectionStatusText());
}

export function syncInitialToggleState() {
  state.useLocalPatternOrder = dom.localOrderToggle.checked;
  state.useFrequencyClauseTypeOrder = dom.clauseTypeOrderToggle.checked;
  state.hideZeroClauseTypes = dom.hideZeroClauseTypesToggle.checked;
  dom.hideZeroClauseTypesToggle.disabled = !state.useFrequencyClauseTypeOrder;
  if (!state.useFrequencyClauseTypeOrder) {
    state.hideZeroClauseTypes = false;
    dom.hideZeroClauseTypesToggle.checked = false;
  }
  syncChapterSelectForBook();
}

