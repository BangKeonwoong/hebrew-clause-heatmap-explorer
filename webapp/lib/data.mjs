import {
  CLAUSES_URL_CANDIDATES,
  STATS_URL_CANDIDATES,
  state,
} from "./state.mjs";

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

function indexClauses() {
  state.clausesByBook.clear();
  state.clausesByBookChapter.clear();
  state.scopeIndex.clear();

  const chapters = {};

  for (const r of state.clauses) {
    const book = r.book;
    const chapter = r.chapter;

    let byBook = state.clausesByBook.get(book);
    if (!byBook) {
      byBook = [];
      state.clausesByBook.set(book, byBook);
    }
    byBook.push(r);

    const key = `${book}::${chapter}`;
    let byBookChapter = state.clausesByBookChapter.get(key);
    if (!byBookChapter) {
      byBookChapter = [];
      state.clausesByBookChapter.set(key, byBookChapter);
    }
    byBookChapter.push(r);

    if (!chapters[book]) chapters[book] = new Set();
    chapters[book].add(chapter);
  }

  state.chaptersByBook = {};
  for (const [b, set] of Object.entries(chapters)) {
    state.chaptersByBook[b] = Array.from(set).sort((a, b2) => a - b2);
  }
}

export async function loadData() {
  const [statsResp, clausesResp] = await Promise.all([
    fetchFirstOk(STATS_URL_CANDIDATES, "word_order_stats.json"),
    fetchFirstOk(CLAUSES_URL_CANDIDATES, "clauses_detailed.json"),
  ]);

  state.statsData = await statsResp.json();
  state.clauses = await clausesResp.json();

  state.books = Object.keys(state.statsData);
  state.bookIndex = Object.fromEntries(state.books.map((b, i) => [b, i]));

  indexClauses();
}
