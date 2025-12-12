import argparse
import json
from pathlib import Path

from analysis_core import analyze_clause, load_app


def extract_detailed_clauses(output_path: str) -> None:
    A = load_app()
    F = A.TF.api.F
    T = A.TF.api.T
    L = A.TF.api.L

    clauses = F.otype.s("clause")
    total = len(clauses)
    records = []

    for i, c in enumerate(clauses, 1):
        book, chapter, verse = T.sectionFromNode(c)
        clause_type = F.typ.v(c) or "Unknown"
        pattern, _ = analyze_clause(c, F, T, L)
        if not pattern:
            pattern = "No-Const"
        hebrew = T.text(c).strip()

        records.append(
            {
                "node": c,
                "book": book,
                "chapter": chapter,
                "verse": verse,
                "clause_type": clause_type,
                "pattern": pattern,
                "hebrew": hebrew,
            }
        )

        if i % 5000 == 0:
            print(f"{i}/{total} clauses...")

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(records)} clauses to {out}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract per-clause detailed data for heatmap exploration."
    )
    parser.add_argument(
        "-o",
        "--output",
        default="results/clauses_detailed.json",
        help="Output JSON path.",
    )
    args = parser.parse_args()
    extract_detailed_clauses(args.output)


if __name__ == "__main__":
    main()

