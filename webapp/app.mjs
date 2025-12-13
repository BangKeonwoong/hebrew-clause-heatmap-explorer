import { loadData } from "./lib/data.mjs";
import { computeAllClauseTypes, computeAllPatterns } from "./lib/compute.mjs";
import { setSelectionInfo } from "./lib/utils.mjs";
import { populateBooks, bindEvents, recomputeAndRender, syncInitialToggleState } from "./lib/ui.mjs";
import { TOSS_DONATE_URL } from "./lib/config.mjs";

async function init() {
  setSelectionInfo("데이터 로딩 중...");

  await loadData();
  computeAllPatterns();
  computeAllClauseTypes();

  // Donations (optional)
  const donateActions = document.getElementById("donateActions");
  const donateTossLink = document.getElementById("donateTossLink");
  if (TOSS_DONATE_URL && donateActions && donateTossLink) {
    donateTossLink.href = TOSS_DONATE_URL;
    donateActions.hidden = false;
  }

  populateBooks();
  bindEvents();
  syncInitialToggleState();
  recomputeAndRender({ clearSelection: true });
}

init().catch((err) => {
  console.error(err);
  setSelectionInfo(`오류: ${err.message}`);
});
