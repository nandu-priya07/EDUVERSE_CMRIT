"""
SDXL Prompt Generator Module for Educational Comics.
Formats visual scene prompts with strict comic book storytelling style,
character reference consistency, dynamic composition, and negative prompt filtering.
"""

from typing import Dict, Any, List

# Mandatory style keywords required for true comic panel generation
COMIC_STYLE_KEYWORDS = (
    "educational comic book illustration, sequential comic panel, expressive characters, "
    "dynamic character poses, expressive facial expressions, cinematic composition, "
    "comic-book storytelling, detailed immersive environment, visually engaging computer lab classroom, "
    "clear visual storytelling, professional educational comic artwork"
)

# Negative prompt to strictly forbid infographic / presentation slide artifacts
COMIC_NEGATIVE_PROMPT = (
    "infographic, presentation slide, PowerPoint, UI card, flowchart, flat architecture diagram, "
    "technical dashboard, diagram-only image, boxes, arrows, text inside boxes, empty background, "
    "geometric shapes, circles as people, stick figures, text, words, letters, watermark, blurry, low quality"
)

def build_sdxl_prompt(panel_data: Dict[str, Any], characters: List[Dict[str, Any]], style: str = "modern_comic") -> str:
    """Builds a refined SDXL image prompt requesting rich sequential comic artwork."""
    
    style_presets = {
        "modern_comic": "vivid modern educational comic book illustration, crisp line art, rich comic coloring, graphic novel art style",
        "manga": "manga comic panel art style, crisp ink lineart, expressive character drawing, screen tone comic background",
        "flat_art": "clean vibrant educational comic book illustration, crisp character line art, detailed background scene",
        "cartoon": "3D animated cartoon comic book panel, Pixar quality, expressive characters, rich atmospheric lighting"
    }

    style_prefix = style_presets.get(style.lower(), style_presets["modern_comic"])

    # Extract scene details
    scene_description = panel_data.get("visual_prompt") or panel_data.get("scene") or "Professor explaining educational concept to student"
    action = panel_data.get("action", "")
    expressions = panel_data.get("expressions", "")
    camera = panel_data.get("camera", "medium shot")
    background = panel_data.get("background", "futuristic computer laboratory with glowing screens")

    # Character visual reference sheet string for consistency
    char_descriptors = []
    for char in characters:
        if isinstance(char, dict) and "name" in char and "description" in char:
            char_descriptors.append(f"{char['name']} ({char['description']})")
        elif isinstance(char, str):
            char_descriptors.append(char)
            
    char_str = ", ".join(char_descriptors) if char_descriptors else "Professor Spark (male teacher with glasses and lab coat) and Arun (student in green hoodie)"

    full_prompt = (
        f"{style_prefix}. {COMIC_STYLE_KEYWORDS}. "
        f"Camera: {camera}. Environment: {background}. "
        f"Scene: {scene_description}. Action: {action}. Expressions: {expressions}. "
        f"Featuring characters: {char_str}. "
        f"Grounded technical concept represented visually through character interaction and lab equipment. "
        f"No text, no words, no speech bubbles, clean comic art."
    )

    return full_prompt.strip()

def get_negative_prompt() -> str:
    """Returns standard negative prompt to prevent presentation/infographic artifacts."""
    return COMIC_NEGATIVE_PROMPT

class SDXLPromptGenerator:
    """Class wrapper for prompt generation."""
    
    def build_prompt(
        self,
        scene_description: str,
        characters: List[Dict[str, Any]],
        style_preset: str = "modern_comic"
    ) -> str:
        panel_data = {"visual_prompt": scene_description}
        return build_sdxl_prompt(panel_data, characters, style_preset)
