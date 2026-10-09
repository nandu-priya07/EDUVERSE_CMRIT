from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class DocumentInfo(BaseModel):
    filename: str
    page_count: int
    chunk_count: int
    file_size_bytes: int
    formatted_file_size: str
    upload_time: str
    status: str = "ready"


class UploadResponse(BaseModel):
    success: bool
    message: str
    document: DocumentInfo


class SourceChunk(BaseModel):
    chunk_id: str
    document: str
    page: int
    text: str
    similarity_score: Optional[float] = None
    distance: Optional[float] = None


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Question asked by the user")
    top_k: Optional[int] = Field(default=None, ge=1, le=10, description="Optional override for chunk retrieval count")


class ChatResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceChunk]
    source_pages: List[int]
    document_name: str
    latency_ms: float
    debug_info: Optional[Dict[str, Any]] = None


class HealthResponse(BaseModel):
    status: str
    app: str
    llm_provider: str
    has_api_key: bool
    embedding_model: str
    has_active_document: bool
    active_document: Optional[str] = None
