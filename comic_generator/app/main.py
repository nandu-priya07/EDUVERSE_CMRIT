"""
FastAPI Main Application Entry Point for SmartCampus Educational Comic AI Generator.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger
from app.core.gpu import clean_gpu_memory
from app.api.routes import router as comic_router

app = FastAPI(
    title="SmartCampus Notes-to-Educational-Comics Generator API",
    description=(
        "Local GPU-Optimized AI Service for converting study notes and educational PDFs "
        "into structured educational comic strips with Pillow overlays and PDF exports."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup for local React/SmartCampus integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5173",
        "*"  # Allowed for local integration flexibility
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(comic_router)

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing SmartCampus Educational Comic AI Service...")
    clean_gpu_memory()
    try:
        from app.image_generation.model_manager import ImageModelManager
        logger.info("Pre-warming SDXL Turbo diffusers model on GPU...")
        ImageModelManager.get_instance().load_pipeline()
    except Exception as e:
        logger.error(f"Failed to pre-warm SDXL pipeline on startup: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Comic Generator Service and cleaning VRAM...")
    clean_gpu_memory()

@app.get("/")
def root():
    return {
        "service": "SmartCampus Notes-to-Educational-Comics AI Generator",
        "status": "online",
        "docs": "/docs",
        "health": "/api/comic/health"
    }
