import re

def clean_extracted_text(text: str, max_chars: int = 15000) -> str:
    """Clean and normalize extracted course notes/text."""
    if not text:
        return ""

    # Remove non-printable characters except newlines/tabs
    cleaned = re.sub(r"[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]", " ", text)
    
    # Remove multiple spaces/newlines
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n\s*\n\s*\n+", "\n\n", cleaned)
    
    # Remove standalone page numbers or headers like "Page 1 of 12"
    cleaned = re.sub(r"(?i)page\s+\d+\s+of\s+\d+", "", cleaned)
    
    cleaned = cleaned.strip()

    # Truncate if exceeds max context length to avoid LLM context overflow
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars] + "\n...[Content truncated for processing]"

    return cleaned
