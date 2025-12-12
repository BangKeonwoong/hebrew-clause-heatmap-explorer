from tf.app import use

# Function Mapping Configuration
# Maps BHSA 'function' feature to simplified constituent labels
FUNCTION_MAP = {
    'Pred': 'V',    # Predicate -> Verb
    'Subj': 'S',    # Subject
    'Objc': 'O',    # Object
    'Cmpl': 'C',    # Complement
    'PreC': 'C',    # Predicate Complement
    'Adju': 'A',    # Adjunct
    'Time': 'A',    # Time Adjunct -> A
    'Loca': 'A',    # Location Adjunct -> A
    'Modi': 'M',    # Modifier
    
    # Extended Mappings for No-Const Resolution
    'PreO': 'V',    # Predicate with Object suffix -> Verb
    'PreS': 'V',    # Predicate with Subject suffix -> Verb
    'PtcO': 'V',    # Participle with Object suffix -> Verb
    'Voct': 'Voc',  # Vocative -> Voc
    'Frnt': 'F',    # Fronted Element -> F
    'Intj': 'Inj',  # Interjection -> Inj
    'Ques': 'Q',    # Question Word -> Q
    'Nega': 'Neg',  # Negation -> Neg
    
    # Rare predicate types
    'Exst': 'V',    # Existence -> Verb/Pred
}

IGNORED_FUNCTIONS = {'Conj', 'Rela', 'Modi'} # Reduced ignored set

def get_constituent_label(func_name):
    """Maps raw BHSA phrase function to simplified label."""
    if func_name in FUNCTION_MAP:
        return FUNCTION_MAP[func_name]
    return None # Ignore or treat as Unknown

def analyze_clause(clause_node, F, T, L):
    """
    Analyzes a single clause node to extract its constituent order.
    Returns:
        pattern (str): e.g., "V-S-O"
        text_structure (str): e.g., "V(word) S(word)..." for debugging
    """
    phrases = L.d(clause_node, 'phrase')
    constituents = []
    debug_parts = []
    
    for p in phrases:
        func = F.function.v(p)
        label = get_constituent_label(func)
        
        if label:
            constituents.append(label)
            # Get text for debug (first word or whole phrase)
            p_text = T.text(p).strip()
            debug_parts.append(f"{label}({p_text})")
            
    pattern = "-".join(constituents)
    return pattern, " ".join(debug_parts)

def load_app():
    return use('etcbc/bhsa', ho=False, silent='deep')

def main_test():
    A = load_app()
    F = A.TF.api.F
    T = A.TF.api.T
    L = A.TF.api.L
    
    print("--- Analysis Logic Test ---")
    clauses = list(F.otype.s('clause'))[:20]
    
    for c in clauses:
        typ = F.typ.v(c)
        pattern, debug_info = analyze_clause(c, F, T, L)
        c_text = T.text(c).strip()
        print(f"[{typ}] {pattern:10} | {c_text[:50]}... -> {debug_info}")

if __name__ == "__main__":
    main_test()
