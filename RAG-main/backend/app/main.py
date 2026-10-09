import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

import torch
if not hasattr(torch, "accelerator"):
    class DummyDevice:
        type = "cuda"
    class DummyAccelerator:
        @staticmethod
        def is_available():
            return torch.cuda.is_available()
        @staticmethod
        def current_accelerator():
            return DummyDevice()
    torch.accelerator = DummyAccelerator()

# Ensure backend root is on sys.path regardless of working directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.upload import router as upload_router
from app.api.chat import router as chat_router
from app.api.document import router as document_router

# Configure clean logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("pdfmind")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    settings = get_settings()
    logger.info(f"Starting {settings.APP_NAME}...")
    logger.info(f"Embedding model: {settings.EMBEDDING_MODEL_NAME}")
    logger.info(f"LLM Provider: {settings.LLM_PROVIDER}")
    logger.info(f"Chroma DB Path: {settings.absolute_chroma_dir}")
    yield
    # Shutdown actions
    logger.info(f"Shutting down {settings.APP_NAME}...")


settings = get_settings()

app = FastAPI(
    title="PDFMind API",
    description="A Simple PDF-Based RAG Question Answering Application",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler ensuring internal stack traces are never exposed to the frontend.
    Logs detailed trace on the backend for debugging.
    """
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected server error occurred. Please verify your document and try again."
        }
    )


# Include API Routers
app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(document_router)


@app.get("/")
def root():
    return {
        "app": "PDFMind",
        "tagline": "Ask questions. Get answers from your documents.",
        "status": "online",
        "docs_url": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=str(BACKEND_DIR))
