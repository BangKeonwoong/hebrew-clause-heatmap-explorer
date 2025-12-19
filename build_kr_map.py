import argparse
import json
from pathlib import Path

import pandas as pd


def normalize_text(s: str) -> str:
    if s is None:
        return ""
    # pandas may give NaN as float
    try:
        if pd.isna(s):
            return ""
    except Exception:
        pass
    if not isinstance(s, str):
        s = str(s)
    return " ".join(s.strip().split())


def main() -> None:
    p = argparse.ArgumentParser(
        description="clauses_detailed.json과 한국어 직역 CSV를 매칭해 node->kr 맵(JSON)을 생성합니다."
    )
    p.add_argument(
        "--clauses",
        default="results/clauses_detailed.json",
        help="clauses_detailed.json 경로",
    )
    p.add_argument(
        "--csv",
        default="data/clause_analysis_ko_stage2_wip_v2024.csv",
        help="한국어 직역 CSV 경로(세미콜론 구분)",
    )
    p.add_argument(
        "--out",
        default="results/clauses_kr_map.json",
        help="출력 JSON 경로",
    )
    args = p.parse_args()

    clauses_path = Path(args.clauses)
    csv_path = Path(args.csv)
    out_path = Path(args.out)

    clauses = json.loads(clauses_path.read_text(encoding="utf-8"))
    df = pd.read_csv(csv_path, sep=";", dtype=str)

    if len(clauses) != len(df):
        raise SystemExit(
            f"행 수 불일치: clauses_detailed={len(clauses)} vs csv={len(df)}"
        )

    mismatches = 0
    for i, c in enumerate(clauses):
        r = df.iloc[i]
        same = (
            c.get("book") == r.get("Book")
            and str(c.get("chapter")) == str(r.get("Chapter"))
            and str(c.get("verse")) == str(r.get("Verse"))
            and normalize_text(c.get("hebrew", "")) == normalize_text(r.get("Hebrew Text", ""))
        )
        if not same:
            mismatches += 1
            if mismatches <= 5:
                print("mismatch", i)
                print(" json:", c.get("book"), c.get("chapter"), c.get("verse"), c.get("hebrew"))
                print(" csv :", r.get("Book"), r.get("Chapter"), r.get("Verse"), r.get("Hebrew Text"))

    if mismatches:
        raise SystemExit(
            f"정렬/매칭 불일치 {mismatches}건 발견: CSV와 clauses_detailed가 같은 순서/내용인지 확인 필요"
        )

    out = {}
    filled = 0
    for i, c in enumerate(clauses):
        kr = normalize_text(df.iloc[i].get("Korean Literal", ""))
        if not kr:
            continue
        out[str(c["node"])] = kr
        filled += 1

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")

    print(f"OK: wrote {filled} translations -> {out_path} (total clauses={len(clauses)})")


if __name__ == "__main__":
    main()
