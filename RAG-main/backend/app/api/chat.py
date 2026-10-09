import time
import logging
from typing import List
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import ChatRequest, ChatResponse, SourceChunk
from app.rag.vectorstore import get_vector_store
from app.rag.retriever import get_retriever
from app.rag.generator import get_generator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Document Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(request: ChatRequest):
    """
    RAG Question-Answering Endpoint:
    1. Validates user question
    2. Verifies that a document is currently indexed
    3. Retrieves top K most relevant chunks from ChromaDB
    4. Generates grounded answer using LLM strictly from retrieved chunks
    5. Returns answer along with source citations, page numbers, and RAG evaluation metrics
    """
    start_time = time.perf_counter()

    question = request.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    vector_store = get_vector_store()
    doc_info = vector_store.get_active_document_info()

    if not doc_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No PDF document is currently loaded. Please upload a document before asking questions."
        )

    doc_name = doc_info.get("filename", "Active Document")

    try:
        # Step 1: Retrieve relevant chunks
        retriever = get_retriever()
        retrieved_chunks = retriever.retrieve(query=question, top_k=request.top_k)

        # Step 2: Generate answer strictly grounded in retrieved chunks
        generator = get_generator()
        answer, debug_info = generator.generate_answer(
            question=question,
            retrieved_chunks=retrieved_chunks
        )

        # Step 3: Extract source pages
        source_pages: List[int] = sorted(list({
            int(chunk["page"]) for chunk in retrieved_chunks if "page" in chunk
        }))

        # Step 4: Format SourceChunk models
        sources: List[SourceChunk] = [
            SourceChunk(
                chunk_id=c["chunk_id"],
                document=c.get("document", doc_name),
                page=int(c.get("page", 1)),
                text=c.get("text", ""),
                similarity_score=c.get("similarity_score"),
                distance=c.get("distance")
            )
            for c in retrieved_chunks
        ]

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Log RAG debug info
        logger.info(
            f"RAG Query: '{question}' | Chunks: {len(retrieved_chunks)} | "
            f"Pages: {source_pages} | Latency: {latency_ms}ms"
        )

        return ChatResponse(
            question=question,
            answer=answer,
            sources=sources,
            source_pages=source_pages,
            document_name=doc_name,
            latency_ms=latency_ms,
            debug_info=debug_info
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling chat query '{question}': {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while answering your question. Please try again."
        )
