"""
FastAPI Routes for Educational Comic AI Generator.
Exposes REST endpoints for background comic creation, status tracking, image/PDF rendering,
single-panel regeneration, PDF file upload, and VRAM health checks.
"""

import os
import shutil
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import settings
from app.core.gpu import get_gpu_info, clean_gpu_memory
from app.services.comic_service import ComicGenerationService, jobs_db
from app.api.schemas import (
    ComicGenerateRequest, JobStatusResponse, HealthResponse
)

router = APIRouter(prefix="/api/comic", tags=["Comic Generator"])
comic_service = ComicGenerationService()

@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint displaying GPU VRAM status."""
    gpu_info = get_gpu_info()
    return HealthResponse(
        status="healthy",
        gpu=gpu_info
    )

@router.post("/generate", response_model=JobStatusResponse)
async def generate_comic(
    background_tasks: BackgroundTasks,
    topic: str = Form(...),
    num_panels: int = Form(4),
    style: str = Form("educational comic book"),
    target_audience: str = Form("college"),
    text_notes: Optional[str] = Form(None),
    llm_provider: str = Form("gemini"),
    file: Optional[UploadFile] = File(None)
):
    """
    Accepts topic, notes, parameters, llm_provider ('gemini' vs 'local'), and optional PDF upload to initiate comic generation.
    Returns immediately with a unique job_id for background status polling.
    """
    pdf_save_path = None
    if file and file.filename:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only .pdf files are supported for upload.")
            
        pdf_save_path = os.path.join(settings.TEMP_DIR, f"upload_{file.filename}")
        with open(pdf_save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    job_id = comic_service.create_job(
        topic=topic,
        num_panels=num_panels,
        style=style,
        target_audience=target_audience,
        text_notes=text_notes,
        pdf_file_path=pdf_save_path,
        llm_provider=llm_provider
    )
    
    # Trigger background pipeline
    background_tasks.add_task(comic_service.run_pipeline_async, job_id)
    
    job_data = comic_service.get_job_status(job_id)
    return JobStatusResponse(**job_data)

@router.get("/status/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    """Poll progress, current step, and results for a given job_id."""
    job_data = comic_service.get_job_status(job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Comic job not found.")
    return JobStatusResponse(**job_data)

@router.get("/result/{job_id}/image")
def get_comic_image(job_id: str):
    """Download or view the composite comic page PNG."""
    job_data = comic_service.get_job_status(job_id)
    if not job_data or job_data["status"] != "completed":
        raise HTTPException(status_code=404, detail="Comic image not ready or job not found.")
        
    img_path = os.path.join(settings.COMIC_DIR, f"{job_id}_comic.png")
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="Comic PNG file not found on server.")
        
    return FileResponse(img_path, media_type="image/png", filename=f"comic_{job_id}.png")

@router.get("/result/{job_id}/pdf")
def get_comic_pdf(job_id: str):
    """Download the composite comic page PDF."""
    job_data = comic_service.get_job_status(job_id)
    if not job_data or job_data["status"] != "completed":
        raise HTTPException(status_code=404, detail="Comic PDF not ready or job not found.")
        
    pdf_path = os.path.join(settings.COMIC_DIR, f"{job_id}_comic.pdf")
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Comic PDF file not found on server.")
        
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"comic_{job_id}.pdf")

@router.get("/panel/{job_id}/{panel_number}")
def get_panel_image(job_id: str, panel_number: int):
    """View an individual processed panel PNG."""
    img_path = os.path.join(settings.PANEL_DIR, f"{job_id}_panel_{panel_number}_processed.png")
    if not os.path.exists(img_path):
        img_path = os.path.join(settings.PANEL_DIR, f"{job_id}_panel_{panel_number}.png")
        
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail=f"Panel {panel_number} image not found.")
        
    return FileResponse(img_path, media_type="image/png")

@router.post("/panel/{job_id}/{panel_number}/regenerate", response_model=JobStatusResponse)
def regenerate_panel(job_id: str, panel_number: int):
    """Regenerates ONLY one specified panel artwork without recreating the whole comic."""
    try:
        updated_job = comic_service.regenerate_single_panel(job_id, panel_number)
        return JobStatusResponse(**updated_job)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{job_id}")
def delete_comic_job(job_id: str):
    """Delete a comic job record and free memory."""
    if job_id in jobs_db:
        del jobs_db[job_id]
        clean_gpu_memory()
        return {"status": "success", "message": f"Job {job_id} deleted."}
    raise HTTPException(status_code=404, detail="Job not found.")
