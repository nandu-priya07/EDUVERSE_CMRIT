from typing import List, Dict, Any, Optional
from app.config import get_settings
from app.rag.embeddings import get_embedding_manager
from app.rag.vectorstore import get_vector_store


class Retriever:
    """
    Handles question embedding and semantic chunk retrieval from ChromaDB.
    """
    def __init__(self):
        self.settings = get_settings()
        self.embedding_manager = get_embedding_manager()
        self.vector_store = get_vector_store()

    def retrieve(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieves the top K relevant chunks for the user's question.
        """
        k = top_k if top_k is not None else self.settings.RETRIEVAL_TOP_K

        # Step 1: Generate embedding for question
        query_embedding = self.embedding_manager.embed_query(query)

        # Step 2: Search ChromaDB
        results = self.vector_store.query_similarity(query_embedding, top_k=k)

        return results


_retriever = Retriever()


def get_retriever() -> Retriever:
    return _retriever
