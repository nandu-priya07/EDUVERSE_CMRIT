"""
PDF Text Extractor using PyMuPDF (fitz) with fallback.
"""

import io
from app.core.logging import logger

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF byte content using PyMuPDF (fitz) or fallback."""
    extracted_text = ""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        logger.info(f"[PDF Extractor] Processing PDF document with {len(doc)} pages.")
        
        pages_text = []
        for i, page in enumerate(doc):
            text = page.get_text("text")
            if text and text.strip():
                pages_text.append(f"--- Page {i+1} ---\n{text.strip()}")
        
        extracted_text = "\n\n".join(pages_text)
        logger.info(f"[PDF Extractor] Extracted {len(extracted_text.split())} words from PDF.")
    except ImportError:
        logger.warning("[PDF Extractor] PyMuPDF (fitz) not installed. Trying basic text decoding fallback.")
        try:
            extracted_text = pdf_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            logger.error(f"[PDF Extractor] Fallback extraction failed: {e}")
    except Exception as e:
        logger.error(f"[PDF Extractor] PyMuPDF error: {e}")
        try:
            extracted_text = pdf_bytes.decode("utf-8", errors="ignore")
        except Exception:
            pass

    return extracted_text

def extract_text_from_file_path(file_path: str) -> str:
    """Extract text from local file path."""
    with open(file_path, "rb") as f:
        return extract_text_from_pdf_bytes(f.read())

def extract_text_from_pdf(file_path_or_bytes) -> str:
    """Alias function supporting both file paths and byte streams."""
    if isinstance(file_path_or_bytes, bytes):
        return extract_text_from_pdf_bytes(file_path_or_bytes)
    return extract_text_from_file_path(str(file_path_or_bytes))
