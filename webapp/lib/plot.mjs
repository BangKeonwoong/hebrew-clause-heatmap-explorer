import { dom } from "./dom.mjs";
import { COLORSCALE, state } from "./state.mjs";
import { displayBookName } from "./utils.mjs";

function buildPlotTitle() {
  if (state.selectedBook === "all") return "Clause Type vs Word Order Patterns (전체)";
  if (state.selectedChapter === "all") {
    return `Clause Type vs Word Order Patterns (${displayBookName(state.selectedBook)})`;
  }
  return `Clause Type vs Word Order Patterns (${displayBookName(state.selectedBook)} ${state.selectedChapter}장)`;
}

export function buildHeatmapSpec() {
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

  const width = Math.min(2000 + patterns.length * 28, 80000);
  const containerHeight = dom.heatmap?.clientHeight || 820;
  const height = Math.max(700, Math.min(containerHeight, 1100));

  const sigmaWidthPx = 64;
  const sigmaHeightPx = 34;
  const sigmaFracX = Math.min(0.06, Math.max(0.0005, sigmaWidthPx / width));
  const sigmaFracY = Math.min(0.12, Math.max(0.0005, sigmaHeightPx / height));

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

export function renderHeatmap({ onClick }) {
  const spec = buildHeatmapSpec();
  Plotly.newPlot(dom.heatmap, spec.data, spec.layout, spec.config);

  if (dom.heatmap?.removeAllListeners) {
    dom.heatmap.removeAllListeners("plotly_click");
  }
  dom.heatmap.on("plotly_click", onClick);
}

