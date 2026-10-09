"""
Asynchronous Comic Generation Pipeline Service.
Orchestrates text extraction, Gemini storyboard generation, panel-by-panel SDXL image generation,
VRAM offloading, single-panel regeneration, and comic page composer assembly.
"""

import os
import uuid
import hashlib
import asyncio
import random
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.core.config import settings
from app.core.logging import logger
from app.core.gpu import clean_gpu_memory
from app.extraction.pdf_extractor import extract_text_from_pdf
from app.extraction.text_cleaner import clean_extracted_text
from app.llm.scene_generator import SceneGenerator
from app.llm.prompt_generator import SDXLPromptGenerator
from app.image_generation.character_consistency import CharacterManager
from app.image_generation.image_generator import PanelImageGenerator
from app.comic.panel import PanelData, DialogueItem
from app.comic.composer import assemble_comic_page

# In-memory job tracker
jobs_db: Dict[str, Dict[str, Any]] = {}
# In-memory content hash cache
cache_db: Dict[str, str] = {}

class ComicGenerationService:
    """Core orchestration service for comic generation jobs."""
    
    def __init__(self):
        self.scene_generator = SceneGenerator()
        self.prompt_generator = SDXLPromptGenerator()
        self.character_manager = CharacterManager()
        self.panel_generator = PanelImageGenerator()
        
    def _compute_hash(
        self,
        text_content: str,
        topic: str,
        num_panels: int,
        style: str,
        target_audience: str
    ) -> str:
        """Create SHA256 hash for caching identical generation requests."""
        raw_str = f"{text_content[:2000]}|{topic}|{num_panels}|{style}|{target_audience}"
        return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    def create_job(
        self,
        topic: str,
        num_panels: int = 4,
        style: str = "educational comic book",
        target_audience: str = "college",
        text_notes: Optional[str] = None,
        pdf_file_path: Optional[str] = None,
        llm_provider: str = "gemini"
    ) -> str:
        """Initialize a new job record and return unique job_id."""
        job_id = str(uuid.uuid4())
        jobs_db[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "progress": 0.0,
            "step": "Initialized",
            "topic": topic,
            "num_panels": num_panels,
            "style": style,
            "target_audience": target_audience,
            "text_notes": text_notes,
            "pdf_file_path": pdf_file_path,
            "llm_provider": llm_provider,
            "title": topic,
            "panels": [],
            "raw_panel_models": [],
            "raw_characters": [],
            "comic_png_url": None,
            "comic_pdf_url": None,
            "error": None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        return job_id

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch current progress and state for a given job_id."""
        return jobs_db.get(job_id)

    async def run_pipeline_async(self, job_id: str):
        """Asynchronously execute full comic generation pipeline in background thread."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._run_pipeline_sync, job_id)

    def _run_pipeline_sync(self, job_id: str):
        """Synchronous execution of full comic generation task."""
        job = jobs_db.get(job_id)
        if not job:
            return
            
        try:
            logger.info(f"Starting pipeline execution for job {job_id} on topic '{job['topic']}' (LLM Provider: {job.get('llm_provider', 'gemini')})")
            
            # 1. Step: Content Extraction
            job["status"] = "extracting"
            job["step"] = "Extracting & cleaning source notes"
            job["progress"] = 0.10
            job["updated_at"] = datetime.now().isoformat()
            
            raw_text = job.get("text_notes", "") or ""
            if job.get("pdf_file_path") and os.path.exists(job["pdf_file_path"]):
                pdf_text = extract_text_from_pdf(job["pdf_file_path"])
                raw_text = f"{raw_text}\n{pdf_text}".strip()
                
            cleaned_text = clean_extracted_text(raw_text)

            # 2. Step: Storyboard Generation (Gemini or Local Fallback)
            job["status"] = "planning"
            job["step"] = f"Generating educational comic script & storyboard ({job.get('llm_provider', 'gemini')})"
            job["progress"] = 0.25
            job["updated_at"] = datetime.now().isoformat()
            
            scene_data = self.scene_generator.generate_scenes(
                topic=job["topic"],
                cleaned_notes=cleaned_text,
                num_panels=job["num_panels"],
                target_audience=job["target_audience"],
                llm_provider=job.get("llm_provider", "gemini")
            )
            
            title = scene_data.get("title", job["topic"])
            job["title"] = title
            raw_characters = scene_data.get("characters", [])
            job["raw_characters"] = raw_characters
            self.character_manager.register_characters(raw_characters)
            
            raw_panels = scene_data.get("panels", [])
            panel_models: List[PanelData] = []
            
            for p_dict in raw_panels:
                dialogue_objs = [
                    DialogueItem(character=d.get("character", "Prof. Spark"), text=d.get("text", ""))
                    for d in p_dict.get("dialogue", [])
                ]
                p_model = PanelData(
                    panel_number=p_dict.get("panel_number", len(panel_models) + 1),
                    concept=p_dict.get("educational_concept") or p_dict.get("concept", ""),
                    scene=p_dict.get("scene", ""),
                    dialogue=dialogue_objs,
                    caption=p_dict.get("narration") or p_dict.get("caption", ""),
                    detailed_explanation=p_dict.get("detailed_explanation") or p_dict.get("narration") or p_dict.get("concept", ""),
                    visual_prompt=p_dict.get("image_prompt") or p_dict.get("visual_prompt", "")
                )
                panel_models.append(p_model)

            job["raw_panel_models"] = panel_models
            clean_gpu_memory()

            # 3. Step: Individual Panel-by-Panel Image Generation
            job["status"] = "generating_panels"
            total_p = len(panel_models)
            
            for idx, panel in enumerate(panel_models):
                step_progress = 0.40 + (idx / total_p) * 0.40
                job["progress"] = round(step_progress, 2)
                job["step"] = f"Generating individual comic panel artwork {idx + 1} of {total_p}"
                job["updated_at"] = datetime.now().isoformat()
                
                # Build enhanced SDXL prompt for panel artwork
                sd_prompt = self.prompt_generator.build_prompt(
                    scene_description=panel.visual_prompt or panel.scene,
                    characters=raw_characters,
                    style_preset=job["style"]
                )
                
                panel_img_filename = f"{job_id}_panel_{panel.panel_number}.png"
                panel_img_path = os.path.join(settings.PANEL_DIR, panel_img_filename)
                
                # Generate artwork image
                final_panel_path = self.panel_generator.generate_panel(
                    prompt=sd_prompt,
                    output_path=panel_img_path,
                    panel_number=panel.panel_number,
                    concept=panel.concept
                )
                panel.image_path = final_panel_path
                
                processed_filename = f"{job_id}_panel_{panel.panel_number}_processed.png"
                panel.processed_image_path = os.path.join(settings.PANEL_DIR, processed_filename)

            clean_gpu_memory()

            # 4. Step: Layout Assembly into Comic Page
            job["status"] = "assembling"
            job["step"] = "Assembling composite comic page, speech bubbles, gutters & PDF"
            job["progress"] = 0.88
            job["updated_at"] = datetime.now().isoformat()
            
            out_png_path = os.path.join(settings.COMIC_DIR, f"{job_id}_comic.png")
            out_pdf_path = os.path.join(settings.COMIC_DIR, f"{job_id}_comic.pdf")
            
            assemble_comic_page(
                panels=panel_models,
                title=title,
                output_png_path=out_png_path,
                output_pdf_path=out_pdf_path
            )
            
            job["comic_png_url"] = f"/api/comic/result/{job_id}/image"
            job["comic_pdf_url"] = f"/api/comic/result/{job_id}/pdf"
            
            # Format output panel dicts for API response
            job["panels"] = [p.dict() for p in panel_models]
            for p in job["panels"]:
                p["panel_image_url"] = f"/api/comic/panel/{job_id}/{p['panel_number']}"
                
            # 5. Completed
            job["status"] = "completed"
            job["step"] = "Educational comic generation complete!"
            job["progress"] = 1.0
            job["updated_at"] = datetime.now().isoformat()
            logger.info(f"Job {job_id} successfully completed comic '{title}'")
            
        except Exception as e:
            logger.exception(f"Error executing comic pipeline for job {job_id}: {str(e)}")
            job["status"] = "failed"
            job["step"] = "Pipeline execution error"
            job["error"] = str(e)
            job["updated_at"] = datetime.now().isoformat()
            clean_gpu_memory()

    def regenerate_single_panel(self, job_id: str, panel_number: int) -> Dict[str, Any]:
        """Regenerates ONLY one specified panel while preserving story continuity and characters."""
        job = jobs_db.get(job_id)
        if not job or job["status"] != "completed":
            raise ValueError(f"Job {job_id} not found or not completed.")

        panel_models: List[PanelData] = job.get("raw_panel_models", [])
        target_panel = next((p for p in panel_models if p.panel_number == panel_number), None)
        
        if not target_panel:
            raise ValueError(f"Panel {panel_number} not found in job {job_id}.")

        logger.info(f"Regenerating single panel #{panel_number} for job {job_id}")

        # Build prompt using character reference sheet
        raw_characters = job.get("raw_characters", [])
        sd_prompt = self.prompt_generator.build_prompt(
            scene_description=target_panel.visual_prompt or target_panel.scene,
            characters=raw_characters,
            style_preset=job.get("style", "educational comic book")
        )

        # Force fresh seed offset for single panel regeneration
        random_seed = random.randint(100, 99999)
        panel_img_filename = f"{job_id}_panel_{panel_number}.png"
        panel_img_path = os.path.join(settings.PANEL_DIR, panel_img_filename)

        final_panel_path = self.panel_generator.generate_panel(
            prompt=sd_prompt,
            output_path=panel_img_path,
            panel_number=panel_number,
            concept=target_panel.concept,
            seed=random_seed
        )
        target_panel.image_path = final_panel_path

        # Re-assemble comic page PNG and PDF
        out_png_path = os.path.join(settings.COMIC_DIR, f"{job_id}_comic.png")
        out_pdf_path = os.path.join(settings.COMIC_DIR, f"{job_id}_comic.pdf")

        assemble_comic_page(
            panels=panel_models,
            title=job.get("title", job["topic"]),
            output_png_path=out_png_path,
            output_pdf_path=out_pdf_path
        )

        job["updated_at"] = datetime.now().isoformat()
        job["panels"] = [p.dict() for p in panel_models]
        for p in job["panels"]:
            p["panel_image_url"] = f"/api/comic/panel/{job_id}/{p['panel_number']}"

        return job
