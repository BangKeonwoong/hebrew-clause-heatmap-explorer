const STATS_URL = "/results/word_order_stats.json";
const CLAUSES_URL = "/results/clauses_detailed.json";

const PAGE_SIZE = 200;

let statsData = null;
let clauses = [];

let allPatterns = [];
let patterns = [];
let clauseTypes = [];
let matrix = [];

let selectedCells = [];
let currentResults = [];
let displayedCount = 0;
let bookIndex = {};
let books = [];
let selectedBook = "all";

function displayBookName(book) {
  return book.replaceAll("_", " ");
}

function setSelectionInfo(text) {
  document.getElementById("selectionInfo").textContent = text;
}

async function loadData() {
  const [statsResp, clausesResp] = await Promise.all([
    fetch(STATS_URL),
    fetch(CLAUSES_URL),
  ]);

  if (!statsResp.ok) throw new Error("word_order_stats.json 로드 실패");
  if (!clausesResp.ok) throw new Error("clauses_detailed.json 로드 실패");

  statsData = await statsResp.json();
  clauses = await clausesResp.json();

  books = Object.keys(statsData);
  bookIndex = Object.fromEntries(books.map((b, i) => [b, i]));
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

function applyPatternLimit(limitValue) {
  if (limitValue === "all") {
    patterns = allPatterns.slice();
    return;
  }
  const limit = Number(limitValue);
  if (!Number.isFinite(limit) || limit <= 0) {
    patterns = allPatterns.slice();
    return;
  }
  patterns = allPatterns.slice(0, limit);
}

function computeClauseTypes() {
  const set = new Set();
  for (const book of Object.values(statsData)) {
    for (const typ of Object.keys(book)) set.add(typ);
  }
  clauseTypes = Array.from(set).sort((a, b) => a.localeCompare(b));
}

function computeMatrix() {
  const typeIndex = Object.fromEntries(clauseTypes.map((t, i) => [t, i]));
  const patIndex = Object.fromEntries(patterns.map((p, i) => [p, i]));

  matrix = clauseTypes.map(() => patterns.map(() => 0));

  const booksToUse =
    selectedBook === "all" ? Object.values(statsData) : [statsData[selectedBook]];

  for (const book of booksToUse) {
    if (!book) continue;
    for (const [typ, patterns] of Object.entries(book)) {
      const i = typeIndex[typ];
      if (i == null) continue;
      for (const [pat, count] of Object.entries(patterns)) {
        const j = patIndex[pat];
        if (j == null) continue;
        matrix[i][j] += count;
      }
    }
  }
}

function renderHeatmap() {
  const z = matrix;
  const text = z.map((row) => row.map((v) => (v ? String(v) : "")));
  const zmax = Math.max(1, Math.max(...z.flat()));

  const trace = {
    type: "heatmap",
    z,
    x: patterns,
    y: clauseTypes,
    // Low counts: very light; high counts: dark blue.
    colorscale: [
      [0, "#f7fbff"],
      [0.2, "#deebf7"],
      [0.4, "#c6dbef"],
      [0.6, "#9ecae1"],
      [0.8, "#6baed6"],
      [1, "#08519c"],
    ],
    zmin: 0,
    zmax,
    showscale: true,
    text,
    texttemplate: "%{text}",
    hovertemplate:
      "ClauseType=%{y}<br>Pattern=%{x}<br>Count=%{z}<extra></extra>",
  };

  // Make the plot wide enough so x-axis pattern names are visible.
  // Show every label and rotate them vertically; users scroll horizontally.
  const dtick = 1;
  const width = Math.min(2000 + patterns.length * 35, 80000);
  const height = Math.min(500 + clauseTypes.length * 12, 1400);

  const layout = {
    title:
      selectedBook === "all"
        ? "Clause Type vs Word Order Patterns (전체)"
        : `Clause Type vs Word Order Patterns (${displayBookName(selectedBook)})`,
    margin: { l: 90, r: 20, t: 40, b: 220 },
    xaxis: {
      automargin: true,
      tickangle: -90,
      tickmode: "linear",
      dtick,
      tickfont: { size: 9 },
    },
    yaxis: { automargin: true },
    autosize: false,
    width,
    height,
    dragmode: false,
  };

  Plotly.newPlot("heatmap", [trace], layout, {
    responsive: false,
    scrollZoom: false,
    displayModeBar: false,
  });

  const heatmapDiv = document.getElementById("heatmap");
  heatmapDiv.on("plotly_click", handleClick);
}

function handleClick(ev) {
  if (!ev.points || ev.points.length === 0) return;

  const pt = ev.points[0];
  const clauseType = pt.y;
  const pattern = pt.x;
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
    return r.book === selectedBook;
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
  applyPatternLimit("all");
  computeClauseTypes();
  computeMatrix();
  renderHeatmap();

  const bookSelect = document.getElementById("bookSelect");
  for (const b of books) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = displayBookName(b);
    bookSelect.appendChild(opt);
  }

  bookSelect.onchange = () => {
    selectedBook = bookSelect.value;
    selectedCells = [];
    updateSelectionUI();
    computeMatrix();
    renderHeatmap();
    filterAndRenderResults(true);
  };

  const limitSelect = document.getElementById("patternLimit");
  limitSelect.onchange = () => {
    applyPatternLimit(limitSelect.value);
    selectedCells = [];
    updateSelectionUI();
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
