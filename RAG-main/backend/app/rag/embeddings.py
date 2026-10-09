from typing import List
from sentence_transformers import SentenceTransformer
from app.config import get_settings


class EmbeddingManager:
    """
    Manages local embeddings using sentence-transformers/all-MiniLM-L6-v2.
    Implemented with lazy initialization so the model is loaded on demand.
    """
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingManager, cls).__new__(cls)
        return cls._instance

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            settings = get_settings()
            # Loads all-MiniLM-L6-v2 locally (downloads to cache if not present)
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        return self._model

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generates embeddings for a batch of text chunks."""
        if not texts:
            return []
        model = self._get_model()
        # convert_to_numpy=True then tolist() ensures standard JSON-serializable float arrays
        embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        """Generates embedding for a single user question."""
        model = self._get_model()
        embedding = model.encode(query, show_progress_bar=False, normalize_embeddings=True)
        return embedding.tolist()


_embedding_manager = EmbeddingManager()


def get_embedding_manager() -> EmbeddingManager:
    return _embedding_manager
