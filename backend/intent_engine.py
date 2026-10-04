"""
Rule-Based Intent Detection and Confidence Estimation Engine for EduAssist.
Demonstrates deterministic pattern, phrase, and keyword matching with
lightweight conversational context support.
"""

from backend.config import INTENT_PATTERNS, CONFIDENCE_THRESHOLD, ACADEMIC_SUBJECTS


def check_contextual_intent(text_lower: str, tokens: list[str], context: dict) -> tuple[str, float, list[str]] | None:
    """
    Check if the message resolves a conversational context, such as specifying
    a subject after an exam or study query.
    """
    if not context:
        return None

    state = context.get("state")
    if state == "awaiting_subject":
        # Check if text contains or matches known academic subjects
        matched_subjects = [s for s in ACADEMIC_SUBJECTS if s.lower() in text_lower]
        if matched_subjects or len(tokens) <= 4:
            subject_name = matched_subjects[0] if matched_subjects else " ".join(tokens).title()
            return ("exam_preparation", 0.91, [subject_name])

    if state == "awaiting_study_focus":
        return ("study_planning", 0.88, ["follow-up focus"])

    return None


def detect_intent(tokens: list[str], raw_text: str, context: dict = None) -> dict:
    """
    Detects user intent using deterministic rule-based pattern matching.
    Calculates transparent rule-based confidence score.

    Returns:
        dict: {
            "intent": str,
            "label": str,
            "confidence": float,
            "matched_keywords": list[str],
            "is_contextual": bool
        }
    """
    text_lower = raw_text.lower().strip()
    token_set = set(tokens)

    # 1. First evaluate conversational context
    contextual_result = check_contextual_intent(text_lower, tokens, context)
    if contextual_result:
        intent_key, conf, matches = contextual_result
        return {
            "intent": intent_key,
            "label": INTENT_PATTERNS.get(intent_key, {}).get("label", intent_key.title()),
            "confidence": round(conf, 2),
            "matched_keywords": matches,
            "is_contextual": True
        }

    # 2. Evaluate scoring across all registered intents
    scores = {}
    matched_data = {}

    for intent_key, rule in INTENT_PATTERNS.items():
        weight = rule.get("weight", 1.0)
        phrase_matches = [p for p in rule["phrases"] if p in text_lower]
        keyword_matches = [k for k in rule["keywords"] if k in token_set]

        # Phrase matches carry 2.5x the weight of single keyword matches
        score = (len(phrase_matches) * 2.5 + len(keyword_matches) * 1.0) * weight
        all_matches = phrase_matches + [k for k in keyword_matches if k not in " ".join(phrase_matches)]

        scores[intent_key] = score
        matched_data[intent_key] = all_matches

    # Find candidate with highest score
    best_intent = max(scores, key=scores.get)
    best_score = scores[best_intent]
    best_matches = matched_data[best_intent]

    # Calculate rule-based confidence score
    if best_score <= 0:
        return {
            "intent": "unknown",
            "label": "Unknown / Unclassified",
            "confidence": 0.20,
            "matched_keywords": [],
            "is_contextual": False
        }

    # Normalization: match score relative to expected density
    # Single keyword match gives ~0.65 - 0.75; phrase match gives ~0.85 - 0.95
    base_confidence = min(0.55 + (best_score * 0.12), 0.96)

    # If confidence falls below threshold
    if base_confidence < CONFIDENCE_THRESHOLD or len(best_matches) == 0:
        return {
            "intent": "unknown",
            "label": "Unknown / Unclassified",
            "confidence": round(base_confidence, 2),
            "matched_keywords": best_matches,
            "is_contextual": False
        }

    return {
        "intent": best_intent,
        "label": INTENT_PATTERNS[best_intent]["label"],
        "confidence": round(base_confidence, 2),
        "matched_keywords": best_matches,
        "is_contextual": False
    }
