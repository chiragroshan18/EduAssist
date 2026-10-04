"""
Rule-Based Tone / Sentiment Analysis Module for EduAssist
Evaluates message tone (positive, neutral, concerned, frustrated)
using transparent, deterministic lexical matching.
"""

from backend.config import TONE_LEXICONS


def analyze_tone(tokens: list[str], raw_text: str) -> dict:
    """
    Analyzes student message tone using rule-based lexical matching.
    Returns:
        dict: {
            "tone": "positive" | "neutral" | "concerned" | "frustrated",
            "score": float,
            "matched_indicators": list[str]
        }
    """
    token_set = set(tokens)
    text_lower = raw_text.lower()

    # Calculate matches for each emotion category
    pos_matches = [w for w in TONE_LEXICONS["positive"] if w in token_set or w in text_lower]
    con_matches = [w for w in TONE_LEXICONS["concerned"] if w in token_set or w in text_lower]
    fru_matches = [w for w in TONE_LEXICONS["frustrated"] if w in token_set or w in text_lower]

    pos_score = len(pos_matches)
    con_score = len(con_matches)
    fru_score = len(fru_matches)

    # Heuristic: multiple exclamation points or all-caps words can amplify frustration/concern
    has_exclamation = "!" in raw_text or "?!" in raw_text
    if has_exclamation and fru_score > 0:
        fru_score += 0.5
    if has_exclamation and con_score > 0:
        con_score += 0.3

    # Resolve dominant tone deterministically
    max_score = max(pos_score, con_score, fru_score)

    if max_score == 0:
        return {
            "tone": "neutral",
            "score": 1.0,
            "matched_indicators": []
        }

    # Frustration takes priority if equal or highest
    if fru_score == max_score and fru_score > 0:
        return {
            "tone": "frustrated",
            "score": min(0.65 + (fru_score * 0.15), 0.98),
            "matched_indicators": fru_matches
        }

    # Concern takes second priority
    if con_score == max_score and con_score > 0:
        return {
            "tone": "concerned",
            "score": min(0.65 + (con_score * 0.15), 0.98),
            "matched_indicators": con_matches
        }

    # Positive tone
    return {
        "tone": "positive",
        "score": min(0.70 + (pos_score * 0.12), 0.99),
        "matched_indicators": pos_matches
    }
