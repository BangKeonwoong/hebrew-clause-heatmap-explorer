const STATS_URL_CANDIDATES = [
  "./data/word_order_stats.json",
  "../results/word_order_stats.json",
];
const CLAUSES_URL_CANDIDATES = [
  "./data/clauses_detailed.json",
  "../results/clauses_detailed.json",
];

const PAGE_SIZE = 200;

let statsData = null;
let clauses = [];

let allPatterns = [];
let patterns = [];
let allClauseTypes = [];
let clauseTypes = [];
let matrix = [];

let selectedCells = [];
let currentResults = [];
let displayedCount = 0;
let bookIndex = {};
let books = [];
let selectedBook = "all";
let selectedChapter = "all";
let chaptersByBook = {};
let useLocalPatternOrder = false;
let useFrequencyClauseTypeOrder = false;
let hideZeroClauseTypes = false;

function displayBookName(book) {
  return book.replaceAll("_", " ");
}

function setSelectionInfo(text) {
  document.getElementById("selectionInfo").textContent = text;
}

async function loadData() {
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

  const [statsResp, clausesResp] = await Promise.all([
    fetchFirstOk(STATS_URL_CANDIDATES, "word_order_stats.json"),
    fetchFirstOk(CLAUSES_URL_CANDIDATES, "clauses_detailed.json"),
  ]);

  statsData = await statsResp.json();
  clauses = await clausesResp.json();

  books = Object.keys(statsData);
  bookIndex = Object.fromEntries(books.map((b, i) => [b, i]));

  // Precompute chapters per book from per-clause data.
  const map = {};
  for (const r of clauses) {
    if (!map[r.book]) map[r.book] = new Set();
    map[r.book].add(r.chapter);
  }
  chaptersByBook = {};
  for (const [b, set] of Object.entries(map)) {
    chaptersByBook[b] = Array.from(set).sort((a, b2) => a - b2);
  }
}

function computeAllPatterns() {
  const counts = {};
  for (const book of Object.values(statsData)) {
    for (const patternsByType of Object.values(book)) {
      for (const [pat, count] of Object.entries(patternsByType)) {
        counts[pat] = (counts[pat] || 0) + count;
      }
    }
  }
  allPatterns = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([pat]) => pat);
}

function computeLocalPatternOrder() {
  if (selectedBook === "all") {
    // No book scope to order by; fall back to global order.
    return allPatterns.slice();
  }
  const counts = {};
  const chapterNum =
    selectedChapter === "all" ? null : Number(selectedChapter);

  for (const r of clauses) {
    if (selectedBook !== "all" && r.book !== selectedBook) continue;
    if (chapterNum != null && r.chapter !== chapterNum) continue;
    counts[r.pattern] = (counts[r.pattern] || 0) + 1;
  }

  const globalRank = Object.fromEntries(allPatterns.map((p, i) => [p, i]));
  return allPatterns
    .slice()
    .sort((a, b) => {
      const ca = counts[a] || 0;
      const cb = counts[b] || 0;
      if (cb !== ca) return cb - ca;
      return (globalRank[a] ?? 99999) - (globalRank[b] ?? 99999);
    });
}

function applyPatternLimit(limitValue, orderSource) {
  if (limitValue === "all") {
    patterns = orderSource.slice();
    return;
  }
  const limit = Number(limitValue);
  if (!Number.isFinite(limit) || limit <= 0) {
    patterns = orderSource.slice();
    return;
  }
  patterns = orderSource.slice(0, limit);
}

function updatePatternsFromState() {
  const baseOrder = useLocalPatternOrder
    ? computeLocalPatternOrder()
    : allPatterns;
  const limitSelect = document.getElementById("patternLimit");
  const limitValue = limitSelect ? limitSelect.value : "all";
  applyPatternLimit(limitValue, baseOrder);
}

function computeAllClauseTypes() {
  const set = new Set();
  for (const book of Object.values(statsData)) {
    for (const typ of Object.keys(book)) set.add(typ);
  }
  allClauseTypes = Array.from(set).sort((a, b) => a.localeCompare(b));
  clauseTypes = allClauseTypes.slice();
}

function computeLocalClauseTypeCounts() {
  const counts = {};
  const chapterNum =
    selectedChapter === "all" ? null : Number(selectedChapter);

  for (const r of clauses) {
    if (selectedBook !== "all" && r.book !== selectedBook) continue;
    if (chapterNum != null && r.chapter !== chapterNum) continue;
    counts[r.clause_type] = (counts[r.clause_type] || 0) + 1;
  }

  return counts;
}

function computeLocalClauseTypeOrder(counts) {
  const globalRank = Object.fromEntries(
    allClauseTypes.map((t, i) => [t, i])
  );

  return allClauseTypes
    .slice()
    .sort((a, b) => {
      const ca = counts[a] || 0;
      const cb = counts[b] || 0;
      if (cb !== ca) return cb - ca;
      return (globalRank[a] ?? 99999) - (globalRank[b] ?? 99999);
    });
}

function updateClauseTypesFromState() {
  if (!useFrequencyClauseTypeOrder) {
    clauseTypes = allClauseTypes.slice();
    return;
  }

  const counts = computeLocalClauseTypeCounts();
  let ordered = computeLocalClauseTypeOrder(counts);
  if (hideZeroClauseTypes) {
    ordered = ordered.filter((t) => (counts[t] || 0) > 0);
  }
  clauseTypes = ordered;
}

function computeMatrix() {
  const typeIndex = Object.fromEntries(clauseTypes.map((t, i) => [t, i]));
  const patIndex = Object.fromEntries(patterns.map((p, i) => [p, i]));

  matrix = clauseTypes.map(() => patterns.map(() => 0));

  const chapterNum =
    selectedChapter === "all" ? null : Number(selectedChapter);

  for (const r of clauses) {
    if (selectedBook !== "all" && r.book !== selectedBook) continue;
    if (chapterNum != null && r.chapter !== chapterNum) continue;
    const i = typeIndex[r.clause_type];
    const j = patIndex[r.pattern];
    if (i == null || j == null) continue;
    matrix[i][j] += 1;
  }
}

function renderHeatmap() {
  const z = matrix;
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

  const colors = [
    [0, "#f7fbff"],
    [0.2, "#deebf7"],
    [0.4, "#c6dbef"],
    [0.6, "#9ecae1"],
    [0.8, "#6baed6"],
    [1, "#08519c"],
  ];

  const totalsColTrace = {
    type: "heatmap",
    z: clauseTypes.map((_, i) => [rowTotals[i]]),
    x: ["Σ"],
    y: clauseTypes,
    xaxis: "x2",
    yaxis: "y",
    colorscale: colors,
    zmin: 0,
    zmax: rowMax,
    showscale: false,
    // Totals numbers are shown in y-axis tick labels to avoid overlap.
    hovertemplate: "ClauseType=%{y}<br>Total=%{z}<extra></extra>",
  };

  const mainTrace = {
    type: "heatmap",
    z,
    x: patterns,
    y: clauseTypes,
    colorscale: colors,
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
    colorscale: colors,
    zmin: 0,
    zmax: colMax,
    showscale: false,
    // Totals numbers are shown in x-axis tick labels to avoid overlap.
    hovertemplate: "Pattern=%{x}<br>Total=%{z}<extra></extra>",
  };

  const grandTotalTrace = {
    type: "heatmap",
    z: [[grandTotal]],
    x: ["Σ"],
    y: ["Σ"],
    xaxis: "x2",
    yaxis: "y2",
    colorscale: colors,
    zmin: 0,
    zmax: Math.max(rowMax, colMax, 1),
    showscale: false,
    text: [[String(grandTotal)]],
    texttemplate: "%{text}",
    hovertemplate: "Grand Total=%{z}<extra></extra>",
  };

  // Make the plot wide enough so x-axis pattern names are visible.
  // Show every label and rotate them vertically; users scroll horizontally.
  // Keep width large enough for all labels (including totals) and use horizontal scroll.
  const width = Math.min(2000 + patterns.length * 28, 80000);
  // Fit height to the visible container so labels are not hidden below (avoid vertical scrolling).
  const containerHeight = document.getElementById("heatmap")?.clientHeight || 820;
  const height = Math.max(700, Math.min(containerHeight, 1100));
  // Reserve fixed-ish pixel space for totals (Σ) column/row.
  const sigmaWidthPx = 64;
  const sigmaHeightPx = 34;
  const sigmaFracX = Math.min(0.06, Math.max(0.0005, sigmaWidthPx / width));
  const sigmaFracY = Math.min(0.12, Math.max(0.0005, sigmaHeightPx / height));

  const layout = {
    title:
      selectedBook === "all"
        ? "Clause Type vs Word Order Patterns (전체)"
        : selectedChapter === "all"
        ? `Clause Type vs Word Order Patterns (${displayBookName(selectedBook)})`
        : `Clause Type vs Word Order Patterns (${displayBookName(selectedBook)} ${selectedChapter}장)`,
    margin: { l: 220, r: 20, t: 40, b: 300 },
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
    },
    xaxis2: {
      automargin: true,
      tickmode: "array",
      tickvals: ["Σ"],
      ticktext: ["Σ"],
      showticklabels: true,
      domain: [0, sigmaFracX],
      layer: "above traces",
    },
    yaxis: {
      automargin: true,
      showticklabels: true,
      tickmode: "array",
      tickvals: clauseTypes,
      ticktext: clauseTypeTickText,
      tickfont: { size: 11 },
      side: "left",
      domain: [sigmaFracY, 1],
      layer: "above traces",
      ticklabeloverflow: "allow",
    },
    yaxis2: {
      automargin: true,
      tickmode: "array",
      tickvals: ["Σ"],
      ticktext: ["Σ"],
      showticklabels: true,
      domain: [0, sigmaFracY],
      side: "left",
      layer: "above traces",
    },
    autosize: false,
    width,
    height,
    dragmode: false,
  };

  Plotly.newPlot(
    "heatmap",
    [totalsColTrace, mainTrace, totalsRowTrace, grandTotalTrace],
    layout,
    {
    responsive: false,
    scrollZoom: false,
    displayModeBar: false,
    }
  );

  const heatmapDiv = document.getElementById("heatmap");
  heatmapDiv.on("plotly_click", handleClick);
}

function handleClick(ev) {
  if (!ev.points || ev.points.length === 0) return;

  const pt = ev.points[0];
  const clauseType = pt.y;
  const pattern = pt.x;
  if (clauseType === "Σ" || pattern === "Σ") return;
  const isShift = ev.event && ev.event.shiftKey;

  if (!isShift) selectedCells = [];

  const key = `${clauseType}||${pattern}`;
  const exists = selectedCells.some(
    (c) => `${c.clauseType}||${c.pattern}` === key
  );

  if (exists) {
    selectedCells = selectedCells.filter(
      (c) => `${c.clauseType}||${c.pattern}` !== key
    );
  } else {
    selectedCells.push({ clauseType, pattern });
  }

  updateSelectionUI();
  filterAndRenderResults(true);
}

function updateSelectionUI() {
  if (selectedCells.length === 0) {
    setSelectionInfo("선택된 셀이 없습니다.");
  } else if (selectedCells.length === 1) {
    const c = selectedCells[0];
    setSelectionInfo(`선택: ${c.clauseType} × ${c.pattern}`);
  } else {
    setSelectionInfo(`선택된 셀 ${selectedCells.length}개`);
  }
}

function filterClauses() {
  if (selectedCells.length === 0) return [];
  const selectedSet = new Set(
    selectedCells.map((c) => `${c.clauseType}||${c.pattern}`)
  );

  const filtered = clauses.filter((r) => {
    if (!selectedSet.has(`${r.clause_type}||${r.pattern}`)) return false;
    if (selectedBook === "all") return true;
    if (r.book !== selectedBook) return false;
    if (selectedChapter === "all") return true;
    return r.chapter === Number(selectedChapter);
  });

  filtered.sort((a, b) => {
    const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
    if (bi !== 0) return bi;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    if (a.verse !== b.verse) return a.verse - b.verse;
    return a.node - b.node;
  });

  return filtered;
}

function renderResults(reset) {
  const resultsDiv = document.getElementById("results");
  const loadMoreBtn = document.getElementById("loadMore");

  if (reset) {
    resultsDiv.innerHTML = "";
    displayedCount = 0;
  }

  const slice = currentResults.slice(displayedCount, displayedCount + PAGE_SIZE);
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
    resultsDiv.appendChild(item);
  }

  displayedCount += slice.length;

  if (displayedCount < currentResults.length) {
    loadMoreBtn.hidden = false;
  } else {
    loadMoreBtn.hidden = true;
  }
}

function filterAndRenderResults(reset) {
  currentResults = filterClauses();

  if (selectedCells.length === 0) {
    setSelectionInfo("선택된 셀이 없습니다.");
    document.getElementById("results").innerHTML = "";
    document.getElementById("loadMore").hidden = true;
    return;
  }

  const cellLabel =
    selectedCells.length === 1
      ? `${selectedCells[0].clauseType} × ${selectedCells[0].pattern}`
      : `선택된 셀 ${selectedCells.length}개`;
  setSelectionInfo(`${cellLabel} · ${currentResults.length}개 절`);

  renderResults(reset);
}

async function init() {
  setSelectionInfo("데이터 로딩 중...");

  await loadData();
  computeAllPatterns();
  updatePatternsFromState();
  computeAllClauseTypes();
  updateClauseTypesFromState();
  computeMatrix();
  renderHeatmap();

  const bookSelect = document.getElementById("bookSelect");
  const chapterSelect = document.getElementById("chapterSelect");
  for (const b of books) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = displayBookName(b);
    bookSelect.appendChild(opt);
  }

  function populateChapters(book) {
    chapterSelect.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "전체";
    chapterSelect.appendChild(allOpt);

    const chs = chaptersByBook[book] || [];
    for (const ch of chs) {
      const opt = document.createElement("option");
      opt.value = String(ch);
      opt.textContent = String(ch);
      chapterSelect.appendChild(opt);
    }
  }

  bookSelect.onchange = () => {
    selectedBook = bookSelect.value;
    selectedChapter = "all";
    if (selectedBook === "all") {
      chapterSelect.disabled = true;
      chapterSelect.value = "all";
    } else {
      chapterSelect.disabled = false;
      populateChapters(selectedBook);
      chapterSelect.value = "all";
    }
    selectedCells = [];
    updateSelectionUI();
    updatePatternsFromState();
    updateClauseTypesFromState();
    computeMatrix();
    renderHeatmap();
    filterAndRenderResults(true);
  };

  chapterSelect.onchange = () => {
    selectedChapter = chapterSelect.value;
    selectedCells = [];
    updateSelectionUI();
    updatePatternsFromState();
    updateClauseTypesFromState();
    computeMatrix();
    renderHeatmap();
    filterAndRenderResults(true);
  };

  const limitSelect = document.getElementById("patternLimit");
  limitSelect.onchange = () => {
    selectedCells = [];
    updateSelectionUI();
    updatePatternsFromState();
    updateClauseTypesFromState();
    computeMatrix();
    renderHeatmap();
    filterAndRenderResults(true);
  };

  const localOrderToggle = document.getElementById("localOrderToggle");
  localOrderToggle.onchange = () => {
    useLocalPatternOrder = localOrderToggle.checked;
    selectedCells = [];
    updateSelectionUI();
    updatePatternsFromState();
    updateClauseTypesFromState();
    computeMatrix();
    renderHeatmap();
    filterAndRenderResults(true);
  };

  const clauseTypeToggle = document.getElementById("clauseTypeOrderToggle");
  const hideZeroToggle = document.getElementById("hideZeroClauseTypesToggle");
  clauseTypeToggle.onchange = () => {
    useFrequencyClauseTypeOrder = clauseTypeToggle.checked;
    hideZeroToggle.disabled = !useFrequencyClauseTypeOrder;
    if (!useFrequencyClauseTypeOrder) {
      hideZeroClauseTypes = false;
      hideZeroToggle.checked = false;
    }
    selectedCells = [];
    updateSelectionUI();
    updateClauseTypesFromState();
    computeMatrix();
    renderHeatmap();
    filterAndRenderResults(true);
  };

  hideZeroToggle.onchange = () => {
    hideZeroClauseTypes = hideZeroToggle.checked;
    selectedCells = [];
    updateSelectionUI();
    updateClauseTypesFromState();
    computeMatrix();
    renderHeatmap();
    filterAndRenderResults(true);
  };

  document.getElementById("clearSelection").onclick = () => {
    selectedCells = [];
    updateSelectionUI();
    filterAndRenderResults(true);
  };

  document.getElementById("loadMore").onclick = () => {
    renderResults(false);
  };

  updateSelectionUI();
  setSelectionInfo("셀을 선택하세요.");
}

init().catch((err) => {
  console.error(err);
  setSelectionInfo(`오류: ${err.message}`);
});
