# Hebrew Clause Type Heatmap Explorer

히브리어 성경(BHSA) 절(clause)의 **ClauseType × 어순 패턴(pattern)** 분포를 히트맵으로 시각화하고,  
히트맵 셀(또는 여러 셀)을 선택하면 해당 조건에 속하는 절의 **책·장·절·히브리어 본문**을 보여주는 로컬 웹앱입니다.

## 구성
- `analysis_core.py`, `extract_data.py`: Text-Fabric BHSA를 이용해 절 어순을 분석/집계.
- `extract_detailed_clauses.py`: 절 단위 상세 데이터(JSON) 추출.
- `results/word_order_stats.json`: ClauseType×Pattern 집계 결과(웹앱이 히트맵을 만드는 데 사용).
- `webapp/`: Plotly 기반 정적 웹앱.

## 사전 준비
- Python 3
- Text-Fabric 및 BHSA 데이터
  - `pip install text-fabric`
  - 첫 실행 시 `etcbc/bhsa` 코퍼스가 다운로드/캐시됩니다.
  - BHSA 데이터는 ETCBC 라이선스를 따르므로 사용/배포 조건을 확인하세요.

## 데이터 생성
### 1) 집계(히트맵) 데이터 생성(선택)
이미 `results/word_order_stats.json`가 포함되어 있지만, 다시 만들고 싶다면:
```bash
python3 extract_data.py
```

### 2) 절 상세 데이터 생성(필수)
`results/clauses_detailed.json`은 용량/라이선스 때문에 저장소에 포함하지 않았습니다.
```bash
python3 extract_detailed_clauses.py
```
생성 후 웹앱에서 셀 클릭 시 절 목록이 정상 표시됩니다.

## 실행
저장소 루트에서 정적 서버를 띄운 뒤 접속합니다.
```bash
python3 -m http.server 8000
```
브라우저에서:
```
http://localhost:8000/webapp/
```

## 사용법
- 셀 클릭: 해당 (ClauseType, Pattern) 절 목록 표시
- Shift+클릭: 여러 셀 선택(합집합)
- 우측 상단 “책 선택”: 특정 책만 히트맵/목록 표시
- “패턴 범위”: 전체 또는 상위 N 패턴만 빠르게 탐색

## 인터넷 배포(정적 호스팅)
이 프로젝트는 빌드가 필요 없는 정적 사이트입니다.  
`results/clauses_detailed.json`(히브리어 절 전체 텍스트 포함)도 **비영리(CC BY‑NC 4.0) 조건 하에 공개 배포**하도록 포함했습니다.

### 1) GitHub Pages로 배포
이미 `.github/workflows/pages.yml`이 포함되어 있습니다.
1. GitHub 저장소 → **Settings → Pages**에서 Source를 **GitHub Actions**로 설정
2. `main` 브랜치에 push하면 자동으로 Pages에 배포됩니다.

배포되는 파일:
- `webapp/*`
- `results/word_order_stats.json` → 배포 시 자동으로 `data/word_order_stats.json`로 복사
- `results/clauses_detailed.json` → 배포 시 자동으로 `data/clauses_detailed.json`로 복사

절 목록이 공개되므로, 상업적 사용이 아닌지와 ETCBC 라이선스 조건을 계속 준수하세요.

### 2) Netlify/Vercel/Cloudflare Pages
정적 사이트 루트를 `webapp/`로 잡고 배포하면 됩니다.
배포 전에:
```bash
mkdir -p webapp/data
cp results/word_order_stats.json webapp/data/word_order_stats.json
```
절 상세 데이터도 공개할 경우 같은 폴더에 넣어주세요:
```bash
cp results/clauses_detailed.json webapp/data/clauses_detailed.json
```

### 라이선스 주의
BHSA/ETCBC 텍스트 데이터의 공개 배포는 라이선스 조건을 따릅니다.  
공개 호스팅 전에 ETCBC 라이선스 범위 내 배포인지 반드시 확인하세요.
