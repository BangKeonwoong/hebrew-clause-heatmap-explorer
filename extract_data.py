import json
from collections import defaultdict
from analysis_core import load_app, analyze_clause

def extract_all_data():
    A = load_app()
    F = A.TF.api.F
    T = A.TF.api.T
    L = A.TF.api.L
    
    # Structure: stats[book_name][clause_type][pattern] = count
    stats = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    
    # Total counters for logging
    total_clauses = 0
    processed_clauses = 0
    
    print("Starting data extraction...")
    
    # Iterate through all books
    for book_node in F.otype.s('book'):
        book_name = T.sectionFromNode(book_node)[0]
        print(f"Processing {book_name}...")
        
        # Get all clauses in this book
        clauses = L.d(book_node, 'clause')
        
        for c in clauses:
            total_clauses += 1
            typ = F.typ.v(c)
            
            # Analyze order
            pattern, debug_info = analyze_clause(c, F, T, L)
            
            # Identify clause type (handle None or empty if necessary, though TF usually has values)
            if not typ:
                typ = "Unknown"
                
            # If pattern is empty (no mapped constituents), maybe label as "Empty" or "Minor"
            if not pattern:
                pattern = "No-Const"
            
            stats[book_name][typ][pattern] += 1
            processed_clauses += 1
            
    print(f"Extraction complete. Processed {processed_clauses} clauses.")
    
    # Convert defaultdict to regular dict for JSON serialization
    final_stats = {k: {k2: dict(v2) for k2, v2 in v.items()} for k, v in stats.items()}
    
    output_path = 'results/word_order_stats.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_stats, f, indent=2, ensure_ascii=False)
        
    print(f"Results saved to {output_path}")

if __name__ == "__main__":
    extract_all_data()
