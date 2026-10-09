from app.api.upload import router as upload_router
from app.api.chat import router as chat_router
from app.api.document import router as document_router

__all__ = ["upload_router", "chat_router", "document_router"]
