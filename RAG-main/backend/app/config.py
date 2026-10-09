from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "PDFMind"
    DEBUG: bool = True

    # Embedding settings
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Chunking settings
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 120

    # Retrieval settings
    RETRIEVAL_TOP_K: int = 4

    # LLM configuration
    LLM_PROVIDER: str = "gemini"  # "gemini" | "openai" | "extractive"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Storage paths
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    DATA_DIR: str = "./data"
    MAX_UPLOAD_SIZE_MB: int = 25

    # Base directory paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent

    @property
    def absolute_chroma_dir(self) -> Path:
        path = Path(self.CHROMA_PERSIST_DIR)
        return path if path.is_absolute() else self.BASE_DIR / path

    @property
    def absolute_data_dir(self) -> Path:
        path = Path(self.DATA_DIR)
        return path if path.is_absolute() else self.BASE_DIR / path

    model_config = SettingsConfigDict(
        env_file=(
            str(Path(__file__).resolve().parent.parent / ".env"),
            ".env",
            "../.env",
            "backend/.env"
        ),
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.absolute_chroma_dir.mkdir(parents=True, exist_ok=True)
    settings.absolute_data_dir.mkdir(parents=True, exist_ok=True)
    return settings
