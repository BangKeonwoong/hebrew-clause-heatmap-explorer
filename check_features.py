from tf.app import use
import sys

def check_features():
    # Load BHSA data with required features
    try:
        # Try full path 'etcbc/bhsa' which is often more reliable
        A = use('etcbc/bhsa', ho=False, silent='deep')
    except Exception as e:
        print(f"Error loading BHSA: {e}")
        return

    if not A:
        print("Failed to load BHSA app.")
        return

    try:
        F = A.TF.api.F
        T = A.TF.api.T
    except AttributeError:
        print("TF API not fully initialized (A.TF.api.F/T missing).")
        return
    
    print("--- Feature Check ---")
    
    # Check 1: Function feature on phrases
    print("\n[Phrase Function Samples]")
    phrases = list(F.otype.s('phrase'))[:10]
    for p in phrases:
        func = F.function.v(p)
        text = T.text(p)
        print(f"Phrase {p}: {text} -> function: {func}")
        
    # Check 2: Clause Type feature
    print("\n[Clause Type Samples]")
    clauses = list(F.otype.s('clause'))[:10]
    for c in clauses:
        typ = F.typ.v(c)
        text = T.text(c)
        print(f"Clause {c}: {text} -> typ: {typ}")
        
    # Check 3: Word PDP (Part of Speech / Phrase Dependent Part of Speech)
    print("\n[Word PDP Samples]")
    words = list(F.otype.s('word'))[:10]
    for w in words:
        pdp = F.pdp.v(w)
        text = T.text(w)
        print(f"Word {w}: {text} -> pdp: {pdp}")

    print("\nSuccess: Text-Fabric loaded and features accessible.")

if __name__ == "__main__":
    check_features()
