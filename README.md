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

