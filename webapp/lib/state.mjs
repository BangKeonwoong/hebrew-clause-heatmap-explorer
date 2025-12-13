export const PAGE_SIZE = 200;

export const COLORSCALE = [
  [0, "#f7fbff"],
  [0.2, "#deebf7"],
  [0.4, "#c6dbef"],
  [0.6, "#9ecae1"],
  [0.8, "#6baed6"],
  [1, "#08519c"],
];

export const STATS_URL_CANDIDATES = [
  "./data/word_order_stats.json",
  "../results/word_order_stats.json",
];

export const CLAUSES_URL_CANDIDATES = [
  "./data/clauses_detailed.json",
  "../results/clauses_detailed.json",
];

export const state = {
  // Data
  statsData: null,
  clauses: [],
  books: [],
  bookIndex: {},
  chaptersByBook: {},

  // Indexes
  clausesByBook: new Map(),
  clausesByBookChapter: new Map(), // key: `${book}::${chapter}`

  // Cached counts
  scopeCounts: new Map(), // scopeKey -> { patternCounts, clauseTypeCounts }

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

