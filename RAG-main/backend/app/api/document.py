import os
import shutil
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from app.config import get_settings
from app.models.schemas import DocumentInfo, HealthResponse
from app.rag.vectorstore import get_vector_store

router = APIRouter(prefix="/api", tags=["Document Management & Health"])


@router.get("/document", response_model=Optional[DocumentInfo])
async def get_current_document():
    """
    Returns metadata for the currently active document, or null if none is indexed.
    """
    vector_store = get_vector_store()
    doc_info = vector_store.get_active_document_info()
    if not doc_info:
        return None
    return DocumentInfo(**doc_info)


@router.delete("/document")
async def delete_current_document():
    """
    Clears the currently loaded document, its chunks from ChromaDB, and saved files.
    """
    settings = get_settings()
    vector_store = get_vector_store()

    # Clear active document metadata and Chroma collection
    vector_store.clear_active_document()

    # Clean data directory of uploaded files
    data_dir = settings.absolute_data_dir
    if data_dir.exists():
        for item in data_dir.iterdir():
            if item.is_file() and not item.name.startswith("."):
                try:
                    item.unlink()
                except Exception:
                    pass

    return {
        "success": True,
        "message": "Current document and indexed vector embeddings cleared successfully."
    }


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Returns backend service health, LLM provider info, and active document state.
    """
    settings = get_settings()
    vector_store = get_vector_store()
    doc_info = vector_store.get_active_document_info()

    has_key = bool(settings.GEMINI_API_KEY) if settings.LLM_PROVIDER == "gemini" else bool(settings.OPENAI_API_KEY)

    return HealthResponse(
        status="healthy",
        app=settings.APP_NAME,
        llm_provider=settings.LLM_PROVIDER,
        has_api_key=has_key,
        embedding_model=settings.EMBEDDING_MODEL_NAME,
        has_active_document=bool(doc_info),
        active_document=doc_info.get("filename") if doc_info else None
    )
