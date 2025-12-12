## 목적
`results/plots/clause_type_heatmap.png`와 동일한 “Clause Type × 상위 10 Word Order Pattern” 히트맵을 웹에서 재현하고,  
사용자가 셀(또는 여러 셀)을 선택하면 그 집합에 해당하는 절(clause)의 **책·장·절·히브리어 본문**을 즉시 조회/표시하는 로컬 웹앱을 만든다.

---
## 현재 산출물/제약
- `results/word_order_stats.json`은 **집계(count)**만 담고 있어 셀→절 목록 매핑이 불가능.
- Text-Fabric BHSA(`etcbc/bhsa`)는 로컬에서 로딩 가능(약 8.8만 clause).
- 히트맵 X축은 전 성경 기준 패턴 빈도 상위 10개, Y축은 ClauseType(사전식 정렬).

---
## 데이터 전략
### 1) 상세 절 데이터 재추출
- Text-Fabric으로 모든 clause를 순회하며 아래 필드를 생성:
  - `node`: clause node id
  - `book`, `chapter`, `verse`: `T.sectionFromNode(c)` 결과
  - `clause_type`: `F.typ.v(c)`
  - `pattern`: `analysis_core.analyze_clause()`로 구성, 비어있으면 `"No-Const"`
  - `hebrew`: `T.text(c).strip()`
- 결과 저장: `results/clauses_detailed.json` (리스트 JSON).  
  약 8.8만 레코드이므로 클라이언트/서버 모두에서 취급 가능.

### 2) 히트맵 매트릭스 계산
- `word_order_stats.json`을 클라이언트에서 로드해:
  1. 패턴별 총합 → 상위 10 패턴 산출(시각화 스크립트와 동일 로직).
  2. ClauseType 전체 집합을 사전식 정렬.
  3. (ClauseType, Pattern)별 빈도 매트릭스 생성.

---
## 웹앱 전략
### 기술 스택
- **프론트만**으로 구현(로컬 정적 웹앱).
- `Plotly.js` heatmap으로 히트맵 렌더/클릭 이벤트 처리.

### UI/UX
- 화면 구성:
  - 좌측/상단: 히트맵(값 annotation 포함).
  - 우측 또는 모달: 선택된 셀의 절 목록.
- 상호작용:
  - **단일 클릭**: 해당 셀 선택(이전 선택 초기화).
  - **Shift+클릭**: 다중 선택 누적(OR 집합).
  - “선택 초기화” 버튼 제공.
- 목록:
  - 헤더에 선택 정보와 개수 표기.
  - `Book Chapter:Verse — Hebrew` 형식으로 표시.
  - 레코드가 많을 때를 대비해 200개 단위 “더 보기” 페이징.

### 파일 구조(예정)
- `extract_detailed_clauses.py`: 상세 절 데이터 추출 스크립트.
- `webapp/index.html`
- `webapp/app.js`
- `webapp/style.css`

---
## 단계별 작업 계획
1. `extract_detailed_clauses.py` 추가 및 실행 → `clauses_detailed.json` 생성.
2. `webapp/` 정적 웹앱 구성(Plotly 기반 히트맵).
3. 클릭/다중선택 이벤트와 절 목록 패널 구현.
4. 로컬 실행 가이드 작성 및 동작 확인.

---
## 로컬 실행 방법(완료 후)
1. 상세 데이터 생성:  
   `python3 extract_detailed_clauses.py`
2. 루트에서 정적 서버 실행:  
   `python3 -m http.server 8000`
3. 브라우저에서 열기:  
   `http://localhost:8000/webapp/`

