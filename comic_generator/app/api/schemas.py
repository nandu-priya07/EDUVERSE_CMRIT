"""
Pydantic Request and Response Schemas for the Educational Comic Generator API.
"""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class ComicGenerateRequest(BaseModel):
    topic: str = Field(..., description="Educational topic or subject title (e.g., 'Apache Spark Architecture')")
    num_panels: int = Field(default=4, ge=2, le=9, description="Number of panels in the comic (2 to 9)")
    style: str = Field(default="modern_comic", description="Visual style: 'modern_comic', 'manga', 'cartoon', 'line_art', 'vector'")
    target_audience: str = Field(default="college", description="Target audience: 'college', 'high_school', 'elementary'")
    text_notes: Optional[str] = Field(default=None, description="Optional raw study notes, lecture content, or text context")

class DialogueSchema(BaseModel):
    character: str
    text: str

class PanelResponseSchema(BaseModel):
    panel_number: int
    concept: str
    scene: str
    dialogue: List[DialogueSchema] = []
    caption: str = ""
    visual_prompt: str = ""
    panel_image_url: Optional[str] = None

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    step: str
    topic: str
    num_panels: int
    style: str
    target_audience: str
    title: Optional[str] = None
    panels: List[PanelResponseSchema] = []
    comic_png_url: Optional[str] = None
    comic_pdf_url: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str

class HealthResponse(BaseModel):
    status: str
    gpu: Dict[str, Any]
