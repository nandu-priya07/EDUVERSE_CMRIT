import os
import shutil
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.config import get_settings
from app.models.schemas import UploadResponse, DocumentInfo
from app.rag.loader import load_pdf, PDFProcessingError
from app.rag.chunker import TextChunker
from app.rag.vectorstore import get_vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Document Upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Accepts and processes an uploaded PDF document:
    1. Validates file format and size
    2. Extracts clean text page by page with PyMuPDF
    3. Chunks document with overlap and sentence boundaries
    4. Computes embeddings and indexes into ChromaDB vector store
    5. Replaces any existing active document
    """
    settings = get_settings()

    # 1. Validate file extension
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF documents (.pdf) are supported."
        )

    # 2. Save file temporarily and check size
    data_dir = settings.absolute_data_dir
    save_path = data_dir / filename

    try:
        total_size = 0
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        with open(save_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # Read in 1MB chunks
                total_size += len(chunk)
                if total_size > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"PDF exceeds the maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
                    )
                buffer.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF file is empty (0 bytes)."
            )

        logger.info(f"Received PDF '{filename}' ({total_size} bytes). Processing text...")

        # 3. Extract text from PDF
        pages = load_pdf(save_path, filename)
        total_pages = len(pages)

        # 4. Chunk text into segments
        chunker = TextChunker(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        chunks = chunker.chunk_document_pages(pages)

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not generate text chunks from the document. Please ensure the PDF has readable text."
            )

        logger.info(f"Document '{filename}' split into {len(chunks)} chunks across {total_pages} pages.")

        # 5. Embed and index chunks into ChromaDB
        vector_store = get_vector_store()
        doc_info = vector_store.index_document(
            chunks=chunks,
            filename=filename,
            total_pages=total_pages,
            file_size_bytes=total_size
        )

        return UploadResponse(
            success=True,
            message=f"Successfully processed and indexed '{filename}' ({total_pages} pages, {len(chunks)} chunks).",
            document=DocumentInfo(**doc_info)
        )

    except PDFProcessingError as e:
        logger.warning(f"PDF processing error for '{filename}': {e.message}")
        if save_path.exists():
            try:
                save_path.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=e.status_code, detail=e.message)

    except HTTPException:
        if save_path.exists():
            try:
                save_path.unlink()
            except Exception:
                pass
        raise

    except Exception as e:
        logger.error(f"Unexpected error while processing '{filename}': {str(e)}", exc_info=True)
        if save_path.exists():
            try:
                save_path.unlink()
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the PDF. Please ensure the file is not corrupted."
        )
    finally:
        await file.close()


@router.post("/upload-sample", response_model=UploadResponse)
async def upload_sample_pdf():
    """
    Convenience endpoint to index the bundled sample document (Data Structures Guide).
    """
    settings = get_settings()
    sample_path = settings.BASE_DIR.parent / "sample_documents" / "data_structures_guide.pdf"

    if not sample_path.exists():
        # Check inside backend/sample_documents
        sample_path = settings.BASE_DIR / "sample_documents" / "data_structures_guide.pdf"

    if not sample_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample document 'data_structures_guide.pdf' was not found."
        )

    filename = "data_structures_guide.pdf"
    file_size = sample_path.stat().st_size

    try:
        pages = load_pdf(sample_path, filename)
        chunker = TextChunker(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        chunks = chunker.chunk_document_pages(pages)

        vector_store = get_vector_store()
        doc_info = vector_store.index_document(
            chunks=chunks,
            filename=filename,
            total_pages=len(pages),
            file_size_bytes=file_size
        )

        return UploadResponse(
            success=True,
            message="Sample PDF loaded and indexed successfully.",
            document=DocumentInfo(**doc_info)
        )
    except Exception as e:
        logger.error(f"Error loading sample PDF: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load sample document."
        )
