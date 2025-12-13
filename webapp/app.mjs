import { loadData } from "./lib/data.mjs";
import { computeAllClauseTypes, computeAllPatterns } from "./lib/compute.mjs";
import { setSelectionInfo } from "./lib/utils.mjs";
import { populateBooks, bindEvents, recomputeAndRender, syncInitialToggleState } from "./lib/ui.mjs";

async function init() {
  setSelectionInfo("데이터 로딩 중...");

  await loadData();
  computeAllPatterns();
  computeAllClauseTypes();

  populateBooks();
  bindEvents();
  syncInitialToggleState();
  recomputeAndRender({ clearSelection: true });
}

init().catch((err) => {
  console.error(err);
  setSelectionInfo(`오류: ${err.message}`);
});

