import json
import random

def verify_results():
    data_path = 'results/word_order_stats.json'
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print("--- Verification Report ---")
    
    # 1. Total Counts and Unknown Checks
    total_clauses = 0
    unknown_types = 0
    no_const_patterns = 0
    rare_patterns = 0
    total_patterns = 0
    
    pattern_counts = {}
    
    for book, types in data.items():
        for typ, patterns in types.items():
            if typ == "Unknown":
                unknown_types += sum(patterns.values())
            
            for pat, count in patterns.items():
                total_clauses += count
                pattern_counts[pat] = pattern_counts.get(pat, 0) + count
                
                if pat == "No-Const":
                    no_const_patterns += count

    print(f"Total Clauses Processed: {total_clauses}")
    print(f"Clauses with Unknown Type: {unknown_types} ({unknown_types/total_clauses*100:.2f}%)")
    print(f"Clauses with No Constituents: {no_const_patterns} ({no_const_patterns/total_clauses*100:.2f}%)")
    
    # 2. Rare Pattern Analysis
    sorted_patterns = sorted(pattern_counts.items(), key=lambda x: x[1])
    rare_threshold = 5
    rare_list = [p for p, c in sorted_patterns if c < rare_threshold]
    print(f"Number of Unique Patterns: {len(pattern_counts)}")
    print(f"Number of Rare Patterns (<{rare_threshold} occur): {len(rare_list)}")
    print(f"Sample Rare Patterns: {rare_list[:5]}")
    
    # 3. Genesis Sampler (Simulated Manual Verification)
    # Since we can't interactively view text here easily without TF loading, 
    # we rely on the logic test done earlier. 
    # However, let's output the top pattern for Genesis to check sanity.
    gen_patterns = {}
    if 'Genesis' in data:
        for t, pats in data['Genesis'].items():
            for p, c in pats.items():
                gen_patterns[p] = gen_patterns.get(p, 0) + c
    
    top_gen = sorted(gen_patterns.items(), key=lambda x: x[1], reverse=True)[:5]
    print("\n[Sanity Check] Top 5 Patterns in Genesis:")
    for p, c in top_gen:
        print(f"  {p}: {c}")
        
    # Expected: Wayyiqtol often implies V-S-O or V-S.
    # 'V-S' and 'V-S-O' should be high.
    
    with open('results/verification_summary.txt', 'w') as log:
        log.write(f"Total Clauses: {total_clauses}\n")
        log.write(f"No Constituents: {no_const_patterns}\n")
        log.write(f"Top Genesis Patterns: {top_gen}\n")

if __name__ == "__main__":
    verify_results()
