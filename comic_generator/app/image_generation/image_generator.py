"""
Image Generator Module for Panel Artwork.
Handles SDXL Turbo comic panel generation and detailed comic artwork fallback rendering.
"""

import os
from typing import Dict, Any, List, Optional
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from app.core.config import settings
from app.core.logging import logger
from app.llm.prompt_generator import build_sdxl_prompt
from app.image_generation.model_manager import ImageModelManager

def generate_panel_image(
    job_id: str,
    panel_data: Dict[str, Any],
    characters: List[Dict[str, Any]],
    style: str = "modern_comic",
    base_seed: int = 42
) -> str:
    """Generates raw panel image for a single panel and saves PNG to disk."""
    panel_num = panel_data.get("panel_number", 1)
    prompt = build_sdxl_prompt(panel_data, characters, style)
    
    panel_dir = settings.PANELS_DIR / job_id
    panel_dir.mkdir(parents=True, exist_ok=True)
    panel_path = panel_dir / f"panel_{panel_num}.png"

    seed = base_seed + (panel_num * 17)
    width = settings.IMAGE_WIDTH
    height = settings.IMAGE_HEIGHT

    logger.info(f"[Image Generator] Generating Panel #{panel_num} (Seed: {seed}, Res: {width}x{height})")
    
    manager = ImageModelManager.get_instance()
    pil_img = manager.generate_image(prompt, seed=seed, width=width, height=height)

    if pil_img is None:
        logger.info(f"[Image Generator] Rendering rich educational comic panel illustration for Panel #{panel_num}")
        pil_img = create_fallback_educational_panel(panel_data, width, height)

    pil_img.save(panel_path, "PNG")
    logger.info(f"[Image Generator] Saved Panel #{panel_num} to {panel_path.name}")
    return str(panel_path)

def create_fallback_educational_panel(panel_data: Dict[str, Any], width: int = 768, height: int = 768) -> Image.Image:
    """
    Renders an illustrated educational comic panel scene featuring characters,
    classroom/lab environments, and visual technical metaphors.
    """
    panel_num = panel_data.get("panel_number", 1)
    concept = panel_data.get("concept", f"Concept {panel_num}")
    scene_desc = panel_data.get("scene", "Professor explaining concept to student in lab")

    # Create warm/dynamic classroom laboratory background
    img = Image.new("RGB", (width, height), color="#0f172a")
    draw = ImageDraw.Draw(img)

    # 1. Background Environment (Futuristic Computer Lab Wall & Server Lights)
    for y in range(0, int(height * 0.7)):
        ratio = y / (height * 0.7)
        r = int(15 * (1 - ratio) + 30 * ratio)
        g = int(23 * (1 - ratio) + 41 * ratio)
        b = int(42 * (1 - ratio) + 70 * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Lab Floor
    floor_y = int(height * 0.7)
    draw.rectangle([0, floor_y, width, height], fill=(26, 32, 44))
    for x in range(0, width, 50):
        draw.line([(x, floor_y), (x - 30, height)], fill=(45, 55, 72), width=2)

    # Whiteboard / Digital Screen in background
    screen_rect = [60, 50, width - 60, int(height * 0.45)]
    draw.rectangle(screen_rect, fill=(15, 23, 42), outline=(124, 58, 237), width=3)
    
    # Glowing screen header line
    draw.rectangle([60, 50, width - 60, 90], fill=(124, 58, 237))
    
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 20)
        font_text = ImageFont.truetype("arial.ttf", 15)
    except OSError:
        font_title = ImageFont.load_default()
        font_text = ImageFont.load_default()

    draw.text((80, 60), f"PANEL {panel_num}: {concept.upper()}", fill=(255, 255, 255), font=font_title)

    # Background Server Rack illustration on the side
    rack_rect = [width - 150, 100, width - 80, floor_y]
    draw.rectangle(rack_rect, fill=(30, 41, 59), outline=(71, 85, 105), width=2)
    for sy in range(120, floor_y - 20, 30):
        draw.rectangle([width - 140, sy, width - 90, sy + 15], fill=(15, 23, 42))
        # LED indicators
        draw.ellipse([width - 135, sy + 5, width - 130, sy + 10], fill=(34, 197, 94))
        draw.ellipse([width - 125, sy + 5, width - 120, sy + 10], fill=(59, 130, 246))

    # 2. Draw Characters in the Scene (Human comic art style)
    # Character 1: Prof. Spark (Left side - Professor in Lab Coat)
    prof_cx, prof_cy = 220, int(height * 0.58)
    
    # Body / Lab Coat
    draw.polygon([
        (prof_cx - 45, prof_cy + 130),
        (prof_cx - 35, prof_cy + 20),
        (prof_cx + 35, prof_cy + 20),
        (prof_cx + 45, prof_cy + 130)
    ], fill=(241, 245, 249), outline=(30, 41, 59), width=2)
    # Inner Blue Shirt
    draw.polygon([(prof_cx - 15, prof_cy + 20), (prof_cx, prof_cy + 60), (prof_cx + 15, prof_cy + 20)], fill=(37, 99, 235))
    
    # Head & Face
    draw.ellipse([prof_cx - 30, prof_cy - 40, prof_cx + 30, prof_cy + 20], fill=(254, 215, 170), outline=(180, 83, 9), width=2)
    # Hair (Dark grey short hair)
    draw.chord([prof_cx - 32, prof_cy - 45, prof_cx + 32, prof_cy - 10], start=180, end=360, fill=(51, 65, 85))
    # Glasses
    draw.rectangle([prof_cx - 22, prof_cy - 12, prof_cx - 4, prof_cy + 2], outline=(15, 23, 42), width=2)
    draw.rectangle([prof_cx + 4, prof_cy - 12, prof_cx + 22, prof_cy + 2], outline=(15, 23, 42), width=2)
    draw.line([(prof_cx - 4, prof_cy - 5), (prof_cx + 4, prof_cy - 5)], fill=(15, 23, 42), width=2)
    # Eyes & Smile
    draw.ellipse([prof_cx - 16, prof_cy - 8, prof_cx - 10, prof_cy - 2], fill=(15, 23, 42))
    draw.ellipse([prof_cx + 10, prof_cy - 8, prof_cx + 16, prof_cy - 2], fill=(15, 23, 42))
    draw.arc([prof_cx - 12, prof_cy, prof_cx + 12, prof_cy + 12], start=0, end=180, fill=(180, 83, 9), width=2)
    # Extended Arm gesturing toward screen
    draw.line([(prof_cx + 30, prof_cy + 30), (prof_cx + 90, prof_cy - 20)], fill=(241, 245, 249), width=12)

    # Character 2: Arun (Right side - Student in Green Hoodie)
    arun_cx, arun_cy = int(width * 0.65), int(height * 0.60)
    
    # Body / Green Hoodie
    draw.polygon([
        (arun_cx - 40, arun_cy + 120),
        (arun_cx - 30, arun_cy + 20),
        (arun_cx + 30, arun_cy + 20),
        (arun_cx + 40, arun_cy + 120)
    ], fill=(22, 163, 74), outline=(20, 83, 45), width=2)
    
    # Head & Face
    draw.ellipse([arun_cx - 28, arun_cy - 38, arun_cx + 28, arun_cy + 18], fill=(254, 215, 170), outline=(180, 83, 9), width=2)
    # Hair (Messy dark hair)
    draw.chord([arun_cx - 30, arun_cy - 44, arun_cx + 30, arun_cy - 8], start=170, end=370, fill=(30, 41, 59))
    # Eyes & Curious Expression
    draw.ellipse([arun_cx - 15, arun_cy - 8, arun_cx - 9, arun_cy - 2], fill=(15, 23, 42))
    draw.ellipse([arun_cx + 9, arun_cy - 8, arun_cx + 15, arun_cy - 2], fill=(15, 23, 42))
    draw.arc([arun_cx - 10, arun_cy + 2, arun_cx + 10, arun_cy + 12], start=0, end=180, fill=(180, 83, 9), width=2)

    # 3. Visual Concept Illustration on Background Screen
    draw.rectangle([100, 110, width - 180, int(height * 0.42)], fill=(30, 41, 59), outline=(168, 85, 247), width=2)
    
    # Illustrate technical topic visually with glowing nodes inside screen
    nodes = ["Driver Master", "Cluster Control", "Executors (RAM)"]
    for idx, nd in enumerate(nodes):
        nx = 120 + (idx * 150)
        ny = 140
        if nx + 130 < width - 180:
            draw.rectangle([nx, ny, nx + 130, ny + 50], fill=(76, 29, 149), outline=(192, 132, 252), width=2)
            draw.text((nx + 10, ny + 16), nd, fill=(255, 255, 255), font=font_text)
            if idx < 2:
                draw.line([(nx + 130, ny + 25), (nx + 150, ny + 25)], fill=(192, 132, 252), width=3)

    return img

class PanelImageGenerator:
    """Class wrapper for panel generation."""
    
    def generate_panel(
        self,
        prompt: str,
        output_path: str,
        panel_number: int = 1,
        concept: str = "",
        seed: int = 42
    ) -> str:
        """Generates single panel image to output_path using SDXL or comic art fallback."""
        manager = ImageModelManager.get_instance()
        pil_img = manager.generate_image(
            prompt=prompt,
            seed=seed + panel_number * 17,
            width=settings.IMAGE_WIDTH,
            height=settings.IMAGE_HEIGHT
        )
        
        if pil_img is None:
            panel_data = {"panel_number": panel_number, "concept": concept}
            pil_img = create_fallback_educational_panel(panel_data, settings.IMAGE_WIDTH, settings.IMAGE_HEIGHT)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        pil_img.save(output_path, "PNG")
        return output_path
