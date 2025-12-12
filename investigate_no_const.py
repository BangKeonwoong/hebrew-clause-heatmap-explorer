from analysis_core import load_app, get_constituent_label, analyze_clause
from tf.app import use
import collections

def investigate_no_const():
    A = load_app()
    F = A.TF.api.F
    L = A.TF.api.L
    T = A.TF.api.T
    
    no_const_details = collections.defaultdict(int)
    example_clauses = collections.defaultdict(list)
    
    print("Scanning for No-Const clauses...")
    
    clauses = F.otype.s('clause')
    count = 0
    
    for c in clauses:
        # Re-use logic to see what was mapped
        phrases = L.d(c, 'phrase')
        mapped_consts = []
        raw_functions = []
        
        for p in phrases:
            func = F.function.v(p)
            raw_functions.append(func)
            if get_constituent_label(func):
                mapped_consts.append(func)
        
        # If no constituents were mapped
        if not mapped_consts:
            # Create a signature of the raw functions
            # e.g., "Intj", "Conj-Intj", "Ques-Modi"
            signature = "-".join(raw_functions)
            no_const_details[signature] += 1
            
            # Keep a few examples for the top signatures
            if len(example_clauses[signature]) < 3:
                text = T.text(c).strip()
                example_clauses[signature].append(text)
                
            count += 1
            
    print(f"\nTotal No-Const Clauses: {count}")
    
    # Sort by frequency
    sorted_details = sorted(no_const_details.items(), key=lambda x: x[1], reverse=True)
    
    print("\n[Top 20 Structures of No-Const Clauses]")
    for sig, freq in sorted_details[:20]:
        print(f"{freq:5d} | {sig}")
        # Print examples
        for ex in example_clauses[sig]:
            print(f"        -> {ex}")

if __name__ == "__main__":
    investigate_no_const()
