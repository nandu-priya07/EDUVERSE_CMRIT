import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH)

class Settings:
    PROJECT_NAME: str = "SmartCampus Notes-to-Comics AI Generator"
    VERSION: str = "1.0.0"

    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # Gemini API & Models
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY") or os.getenv("gemini_api_key", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "Qwen/Qwen2.5-1.5B-Instruct")
    IMAGE_MODEL: str = os.getenv("IMAGE_MODEL", "stabilityai/sdxl-turbo")

    # Image Gen Configs
    IMAGE_WIDTH: int = int(os.getenv("IMAGE_WIDTH", "768"))
    IMAGE_HEIGHT: int = int(os.getenv("IMAGE_HEIGHT", "768"))
    IMAGE_STEPS: int = int(os.getenv("IMAGE_STEPS", "4"))
    IMAGE_GUIDANCE_SCALE: float = float(os.getenv("IMAGE_GUIDANCE_SCALE", "0.0"))

    # Hardware & Memory Flags (Targeting 6 GB VRAM on RTX 3050)
    USE_CUDA: bool = os.getenv("USE_CUDA", "true").lower() == "true"
    USE_FP16: bool = os.getenv("USE_FP16", "true").lower() == "true"
    USE_CPU_OFFLOAD: bool = os.getenv("USE_CPU_OFFLOAD", "true").lower() == "true"
    ENABLE_ATTENTION_SLICING: bool = os.getenv("ENABLE_ATTENTION_SLICING", "true").lower() == "true"

    # Input Limits
    MAX_PANELS: int = int(os.getenv("MAX_PANELS", "8"))
    MAX_INPUT_SIZE_MB: int = int(os.getenv("MAX_INPUT_SIZE_MB", "50"))

    # Output Storage Paths
    GENERATED_DIR: Path = BASE_DIR / "generated"
    CHARACTERS_DIR: Path = GENERATED_DIR / "characters"
    PANELS_DIR: Path = GENERATED_DIR / "panels"
    COMICS_DIR: Path = GENERATED_DIR / "comics"
    TEMP_DIR: Path = GENERATED_DIR / "temporary"
    MODELS_DIR: Path = BASE_DIR / "models"

    def __init__(self):
        # Ensure output directories exist
        for directory in [self.CHARACTERS_DIR, self.PANELS_DIR, self.COMICS_DIR, self.TEMP_DIR, self.MODELS_DIR]:
            directory.mkdir(parents=True, exist_ok=True)

    @property
    def PANEL_DIR(self) -> Path:
        return self.PANELS_DIR

    @property
    def COMIC_DIR(self) -> Path:
        return self.COMICS_DIR

settings = Settings()
