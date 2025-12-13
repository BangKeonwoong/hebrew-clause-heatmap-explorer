const STATS_URL_CANDIDATES = [
  "./data/word_order_stats.json",
  "../results/word_order_stats.json",
];
const CLAUSES_URL_CANDIDATES = [
  "./data/clauses_detailed.json",
  "../results/clauses_detailed.json",
];

const PAGE_SIZE = 200;

const COLORSCALE = [
  [0, "#f7fbff"],
  [0.2, "#deebf7"],
  [0.4, "#c6dbef"],
  [0.6, "#9ecae1"],
  [0.8, "#6baed6"],
  [1, "#08519c"],
];

const state = {
  // Data
  statsData: null,
  clauses: [],
  books: [],
  bookIndex: {},
  chaptersByBook: {},

  // Filters
  selectedBook: "all",
  selectedChapter: "all",

  // Toggles
  useLocalPatternOrder: false,
  useFrequencyClauseTypeOrder: false,
  hideZeroClauseTypes: false,

  // Derived (view)
  allPatterns: [],
  patterns: [],
  allClauseTypes: [],
  clauseTypes: [],
  matrix: [],

  // Selection + results
  selectedCells: [],
  currentResults: [],
  displayedCount: 0,
};

const dom = {
  heatmap: document.getElementById("heatmap"),
  bookSelect: document.getElementById("bookSelect"),
  chapterSelect: document.getElementById("chapterSelect"),
  patternLimit: document.getElementById("patternLimit"),
  localOrderToggle: document.getElementById("localOrderToggle"),
  clauseTypeOrderToggle: document.getElementById("clauseTypeOrderToggle"),
  hideZeroClauseTypesToggle: document.getElementById("hideZeroClauseTypesToggle"),
  clearSelection: document.getElementById("clearSelection"),
  selectionInfo: document.getElementById("selectionInfo"),
  results: document.getElementById("results"),
  loadMore: document.getElementById("loadMore"),
};

function displayBookName(book) {
  return book.replaceAll("_", " ");
}

function setSelectionInfo(text) {
  dom.selectionInfo.textContent = text;
}

async function fetchFirstOk(urls, label) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp;
      lastErr = new Error(`${label} ${url} 응답 실패: ${resp.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`${label} 로드 실패`);
}

async function loadData() {
  const [statsResp, clausesResp] = await Promise.all([
    fetchFirstOk(STATS_URL_CANDIDATES, "word_order_stats.json"),
    fetchFirstOk(CLAUSES_URL_CANDIDATES, "clauses_detailed.json"),
  ]);

  state.statsData = await statsResp.json();
  state.clauses = await clausesResp.json();

  state.books = Object.keys(state.statsData);
  state.bookIndex = Object.fromEntries(state.books.map((b, i) => [b, i]));

  // Precompute chapters per book from per-clause data.
  const map = {};
  for (const r of state.clauses) {
    if (!map[r.book]) map[r.book] = new Set();
    map[r.book].add(r.chapter);
  }
  state.chaptersByBook = {};
  for (const [b, set] of Object.entries(map)) {
    state.chaptersByBook[b] = Array.from(set).sort((a, b2) => a - b2);
  }
}

function computeAllPatterns() {
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

function computeLocalPatternOrder() {
  if (state.selectedBook === "all") {
    // No book scope to order by; fall back to global order.
    return state.allPatterns.slice();
  }

  const counts = {};
  const chapterNum =
    state.selectedChapter === "all" ? null : Number(state.selectedChapter);

  for (const r of state.clauses) {
    if (r.book !== state.selectedBook) continue;
    if (chapterNum != null && r.chapter !== chapterNum) continue;
    counts[r.pattern] = (counts[r.pattern] || 0) + 1;
  }

  const globalRank = Object.fromEntries(state.allPatterns.map((p, i) => [p, i]));
  return state.allPatterns.slice().sort((a, b) => {
    const ca = counts[a] || 0;
    const cb = counts[b] || 0;
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

function updatePatternsFromState() {
  const baseOrder = state.useLocalPatternOrder
    ? computeLocalPatternOrder()
    : state.allPatterns;
  const limitValue = dom.patternLimit?.value || "all";
  state.patterns = applyPatternLimit(limitValue, baseOrder);
}

function computeAllClauseTypes() {
  const set = new Set();
  for (const book of Object.values(state.statsData)) {
    for (const typ of Object.keys(book)) set.add(typ);
  }
  state.allClauseTypes = Array.from(set).sort((a, b) => a.localeCompare(b));
  state.clauseTypes = state.allClauseTypes.slice();
}

function computeLocalClauseTypeCounts() {
  const counts = {};
  const chapterNum =
    state.selectedChapter === "all" ? null : Number(state.selectedChapter);

  for (const r of state.clauses) {
    if (state.selectedBook !== "all" && r.book !== state.selectedBook) continue;
    if (chapterNum != null && r.chapter !== chapterNum) continue;
    counts[r.clause_type] = (counts[r.clause_type] || 0) + 1;
  }

  return counts;
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

function updateClauseTypesFromState() {
  if (!state.useFrequencyClauseTypeOrder) {
    state.clauseTypes = state.allClauseTypes.slice();
    return;
  }

  const counts = computeLocalClauseTypeCounts();
  let ordered = computeLocalClauseTypeOrder(counts);
  if (state.hideZeroClauseTypes) {
    ordered = ordered.filter((t) => (counts[t] || 0) > 0);
  }
  state.clauseTypes = ordered;
}

function computeMatrix() {
  const typeIndex = Object.fromEntries(state.clauseTypes.map((t, i) => [t, i]));
  const patIndex = Object.fromEntries(state.patterns.map((p, i) => [p, i]));

  state.matrix = state.clauseTypes.map(() => state.patterns.map(() => 0));

  const chapterNum =
    state.selectedChapter === "all" ? null : Number(state.selectedChapter);

  for (const r of state.clauses) {
    if (state.selectedBook !== "all" && r.book !== state.selectedBook) continue;
    if (chapterNum != null && r.chapter !== chapterNum) continue;
    const i = typeIndex[r.clause_type];
    const j = patIndex[r.pattern];
    if (i == null || j == null) continue;
    state.matrix[i][j] += 1;
  }
}

function selectionStatusText() {
  if (state.selectedCells.length === 0) return "셀을 선택하세요.";
  if (state.selectedCells.length === 1) {
    const c = state.selectedCells[0];
    return `선택: ${c.clauseType} × ${c.pattern}`;
  }
  return `선택된 셀 ${state.selectedCells.length}개`;
}

function buildPlotTitle() {
  if (state.selectedBook === "all") return "Clause Type vs Word Order Patterns (전체)";
  if (state.selectedChapter === "all") {
    return `Clause Type vs Word Order Patterns (${displayBookName(state.selectedBook)})`;
  }
  return `Clause Type vs Word Order Patterns (${displayBookName(state.selectedBook)} ${state.selectedChapter}장)`;
}

function buildHeatmapSpec() {
  const z = state.matrix;
  const patterns = state.patterns;
  const clauseTypes = state.clauseTypes;

  const text = z.map((row) => row.map((v) => (v ? String(v) : "")));
  const zmax = Math.max(1, Math.max(...z.flat()));

  const rowTotals = z.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = patterns.map((_, j) =>
    z.reduce((acc, row) => acc + (row[j] || 0), 0)
  );
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);
  const rowMax = Math.max(1, Math.max(...rowTotals));
  const colMax = Math.max(1, Math.max(...colTotals));

  const clauseTypeTickText = clauseTypes.map((t, i) => `${t} (${rowTotals[i]})`);
  const patternTickText = patterns.map((p, j) => `${p} (${colTotals[j]})`);

  const totalsColTrace = {
    type: "heatmap",
    z: clauseTypes.map((_, i) => [rowTotals[i]]),
    x: ["Σ"],
    y: clauseTypes,
    xaxis: "x2",
    yaxis: "y",
    colorscale: COLORSCALE,
    zmin: 0,
    zmax: rowMax,
    showscale: false,
    hovertemplate: "ClauseType=%{y}<br>Total=%{z}<extra></extra>",
  };

  const mainTrace = {
    type: "heatmap",
    z,
    x: patterns,
    y: clauseTypes,
    colorscale: COLORSCALE,
    zmin: 0,
    zmax,
    showscale: true,
    text,
    texttemplate: "%{text}",
    hovertemplate:
      "ClauseType=%{y}<br>Pattern=%{x}<br>Count=%{z}<extra></extra>",
  };

  const totalsRowTrace = {
    type: "heatmap",
    z: [colTotals],
    x: patterns,
    y: ["Σ"],
    xaxis: "x",
    yaxis: "y2",
    colorscale: COLORSCALE,
    zmin: 0,
    zmax: colMax,
    showscale: false,
    hovertemplate: "Pattern=%{x}<br>Total=%{z}<extra></extra>",
  };

  const grandTotalTrace = {
    type: "heatmap",
    z: [[grandTotal]],
    x: ["Σ"],
    y: ["Σ"],
    xaxis: "x2",
    yaxis: "y2",
    colorscale: COLORSCALE,
    zmin: 0,
    zmax: Math.max(rowMax, colMax, 1),
    showscale: false,
    text: [[String(grandTotal)]],
    texttemplate: "%{text}",
    hovertemplate: "Grand Total=%{z}<extra></extra>",
  };

  // Keep the plot wide enough so x-axis pattern names are visible.
  // Users scroll horizontally (no zoom).
  const width = Math.min(2000 + patterns.length * 28, 80000);
  const containerHeight = dom.heatmap?.clientHeight || 820;
  const height = Math.max(700, Math.min(containerHeight, 1100));

  const sigmaWidthPx = 64;
  const sigmaHeightPx = 34;
  const sigmaFracX = Math.min(0.06, Math.max(0.0005, sigmaWidthPx / width));
  const sigmaFracY = Math.min(0.12, Math.max(0.0005, sigmaHeightPx / height));

  // Reserve empty vertical space for rotated x-axis labels.
  const maxXLabelLen = Math.max(1, ...patternTickText.map((s) => s.length));
  const xLabelPadPx = Math.min(220, Math.max(120, Math.round(maxXLabelLen * 6)));
  const xLabelPadFrac = Math.min(0.26, Math.max(0.12, xLabelPadPx / height));

  const layout = {
    title: buildPlotTitle(),
    margin: { l: 280, r: 20, t: 40, b: 240 },
    xaxis: {
      automargin: true,
      tickangle: -90,
      tickmode: "array",
      tickvals: patterns,
      ticktext: patternTickText,
      tickfont: { size: 8 },
      showticklabels: true,
      domain: [sigmaFracX, 1],
      layer: "above traces",
      ticklabeloverflow: "allow",
      anchor: "free",
      position: xLabelPadFrac,
    },
    xaxis2: {
      automargin: true,
      tickmode: "array",
      tickvals: ["Σ"],
      ticktext: ["Σ"],
      showticklabels: true,
      domain: [0, sigmaFracX],
      layer: "above traces",
      anchor: "free",
      position: xLabelPadFrac,
    },
    yaxis: {
      automargin: true,
      showticklabels: true,
      tickmode: "array",
      tickvals: clauseTypes,
      ticktext: clauseTypeTickText,
      tickfont: { size: 11 },
      side: "left",
      domain: [xLabelPadFrac + sigmaFracY, 1],
      layer: "above traces",
      ticklabeloverflow: "allow",
      anchor: "free",
      position: 0,
    },
    yaxis2: {
      automargin: true,
      tickmode: "array",
      tickvals: ["Σ"],
      ticktext: ["Σ"],
      showticklabels: true,
      domain: [xLabelPadFrac, xLabelPadFrac + sigmaFracY],
      side: "left",
      layer: "above traces",
      anchor: "free",
      position: 0,
    },
    autosize: false,
    width,
    height,
    dragmode: false,
  };

  const config = {
    responsive: false,
    scrollZoom: false,
    displayModeBar: false,
  };

  return {
    data: [totalsColTrace, mainTrace, totalsRowTrace, grandTotalTrace],
    layout,
    config,
  };
}

function renderHeatmap() {
  const spec = buildHeatmapSpec();
  Plotly.newPlot(dom.heatmap, spec.data, spec.layout, spec.config);

  if (dom.heatmap?.removeAllListeners) {
    dom.heatmap.removeAllListeners("plotly_click");
  }
  dom.heatmap.on("plotly_click", handlePlotClick);
}

function toggleCellSelection({ clauseType, pattern }, isShift) {
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

function filterClauses() {
  if (state.selectedCells.length === 0) return [];

  const selectedSet = new Set(
    state.selectedCells.map((c) => `${c.clauseType}||${c.pattern}`)
  );
  const chapterNum =
    state.selectedChapter === "all" ? null : Number(state.selectedChapter);

  const filtered = state.clauses.filter((r) => {
    if (!selectedSet.has(`${r.clause_type}||${r.pattern}`)) return false;
    if (state.selectedBook !== "all" && r.book !== state.selectedBook) return false;
    if (chapterNum != null && r.chapter !== chapterNum) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const bi = (state.bookIndex[a.book] ?? 999) - (state.bookIndex[b.book] ?? 999);
    if (bi !== 0) return bi;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    if (a.verse !== b.verse) return a.verse - b.verse;
    return a.node - b.node;
  });

  return filtered;
}

function renderResults(reset) {
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

function renderSelectionAndResults(reset) {
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

function clearSelectionAndPanel() {
  state.selectedCells = [];
  state.currentResults = [];
  state.displayedCount = 0;
  setSelectionInfo(selectionStatusText());
  dom.results.innerHTML = "";
  dom.loadMore.hidden = true;
}

function recomputeAndRender({ clearSelection } = { clearSelection: true }) {
  if (clearSelection) clearSelectionAndPanel();
  updatePatternsFromState();
  updateClauseTypesFromState();
  computeMatrix();
  renderHeatmap();
}

function populateBooks() {
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

function bindEvents() {
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
}

async function init() {
  setSelectionInfo("데이터 로딩 중...");

  await loadData();
  computeAllPatterns();
  computeAllClauseTypes();

  populateBooks();
  bindEvents();

  // Sync initial toggle state from the DOM.
  state.useLocalPatternOrder = dom.localOrderToggle.checked;
  state.useFrequencyClauseTypeOrder = dom.clauseTypeOrderToggle.checked;
  state.hideZeroClauseTypes = dom.hideZeroClauseTypesToggle.checked;
  dom.hideZeroClauseTypesToggle.disabled = !state.useFrequencyClauseTypeOrder;
  if (!state.useFrequencyClauseTypeOrder) {
    state.hideZeroClauseTypes = false;
    dom.hideZeroClauseTypesToggle.checked = false;
  }

  syncChapterSelectForBook();
  recomputeAndRender({ clearSelection: true });
  setSelectionInfo(selectionStatusText());
}

init().catch((err) => {
  console.error(err);
  setSelectionInfo(`오류: ${err.message}`);
});
