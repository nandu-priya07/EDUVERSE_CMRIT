import re
from pathlib import Path
from typing import List, Dict, Any
import pymupdf  # PyMuPDF


class PDFProcessingError(Exception):
    """Custom exception raised during PDF loading and processing."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def clean_text(text: str) -> str:
    """
    Clean extracted PDF text:
    - Replace non-breaking spaces and irregular whitespace
    - Normalize repeated spaces, tabs, and excess blank lines
    - Strip leading and trailing whitespace
    """
    if not text:
        return ""
    # Normalize unicode whitespace
    text = text.replace("\xa0", " ").replace("\r\n", "\n").replace("\r", "\n")
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse multiple horizontal whitespace while keeping newlines
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(lines).strip()


def load_pdf(file_path: Path, filename: str) -> List[Dict[str, Any]]:
    """
    Validates and extracts clean text page-by-page from a PDF using PyMuPDF.
    
    Returns a list of page objects:
    [
        {
            "page": 1,
            "text": "...",
            "document": filename,
            "char_count": 1234
        },
        ...
    ]
    """
    if not file_path.exists():
        raise PDFProcessingError(f"PDF file '{filename}' was not found on disk.", status_code=404)

    # Check magic bytes for PDF signature (%PDF-)
    try:
        with open(file_path, "rb") as f:
            header = f.read(5)
            if not header.startswith(b"%PDF-"):
                raise PDFProcessingError(
                    f"'{filename}' is not a valid PDF file. Missing PDF header signature.",
                    status_code=400
                )
    except Exception as e:
        if isinstance(e, PDFProcessingError):
            raise
        raise PDFProcessingError(f"Failed to read file '{filename}': {str(e)}", status_code=400)

    try:
        doc = pymupdf.open(file_path)
    except Exception as e:
        raise PDFProcessingError(f"Corrupted or unreadable PDF document '{filename}': {str(e)}", status_code=400)

    try:
        if doc.is_encrypted:
            # Attempt blank password decrypt
            if not doc.authenticate(""):
                raise PDFProcessingError(f"PDF '{filename}' is password protected and cannot be read.", status_code=400)

        total_pages = doc.page_count
        if total_pages == 0:
            raise PDFProcessingError(f"The PDF '{filename}' is empty (0 pages).", status_code=400)

        pages_data: List[Dict[str, Any]] = []
        total_extracted_chars = 0

        for page_index in range(total_pages):
            page_number = page_index + 1  # 1-indexed
            page = doc.load_page(page_index)
            raw_text = page.get_text("text") or ""
            cleaned = clean_text(raw_text)

            pages_data.append({
                "document": filename,
                "page": page_number,
                "text": cleaned,
                "char_count": len(cleaned)
            })
            total_extracted_chars += len(cleaned)

        if total_extracted_chars == 0:
            raise PDFProcessingError(
                f"The PDF '{filename}' contains no extractable text. "
                "It may contain scanned images without an embedded text layer (OCR).",
                status_code=422
            )

        return pages_data
    finally:
        doc.close()
