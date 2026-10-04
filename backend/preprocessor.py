"""
Text Preprocessing Module for EduAssist
Provides lightweight, transparent text normalization, tokenization,
and keyword extraction without external heavy ML dependencies.
"""

import re
from backend.config import STOP_WORDS, MAX_MESSAGE_LENGTH


def normalize_whitespace(text: str) -> str:
    """Normalize multiple spaces, tabs, and newlines into single spaces."""
    return re.sub(r"\s+", " ", text).strip()


def remove_punctuation(text: str) -> str:
    """Remove special characters while preserving alphanumeric tokens and internal hyphens."""
    return re.sub(r"[^\w\s\-]", " ", text)


def tokenize(text: str) -> list[str]:
    """
    Split normalized text into lowercase alphanumeric tokens.
    Time Complexity: O(n) where n is text character length.
    """
    cleaned = remove_punctuation(text.lower())
    tokens = [tok.strip("-") for tok in cleaned.split() if tok.strip("-")]
    return tokens


def extract_keywords(tokens: list[str], top_n: int = 6) -> list[str]:
    """
    Filter stop words and extract distinctive content keywords.
    Maintains relative order of first appearance.
    Time Complexity: O(m) where m is token count.
    """
    seen = set()
    keywords = []
    for token in tokens:
        if len(token) > 2 and token not in STOP_WORDS and token not in seen:
            seen.add(token)
            keywords.append(token)
            if len(keywords) >= top_n:
                break
    return keywords


def preprocess_text(text: str) -> dict:
    """
    Complete text preprocessing pipeline.
    Validates length and extracts normalized text, raw tokens, and content keywords.
    """
    if text is None:
        raise ValueError("Message cannot be None")

    clean_text = normalize_whitespace(text)
    if not clean_text:
        raise ValueError("Message cannot be empty or whitespace only")

    if len(clean_text) > MAX_MESSAGE_LENGTH:
        raise ValueError(f"Message exceeds maximum length of {MAX_MESSAGE_LENGTH} characters")

    tokens = tokenize(clean_text)
    keywords = extract_keywords(tokens)

    return {
        "raw_text": text,
        "normalized_text": clean_text.lower(),
        "tokens": tokens,
        "keywords": keywords,
        "token_count": len(tokens)
    }
