import json
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import get_settings
from app.rag.embeddings import get_embedding_manager


class VectorStoreManager:
    """
    Manages vector storage using ChromaDB.
    Supports single active document replacement, persistent indexing, and similarity search.
    """
    COLLECTION_NAME = "pdfmind_active_doc"
    METADATA_FILE = "active_document.json"

    def __init__(self):
        self.settings = get_settings()
        self.persist_dir = self.settings.absolute_chroma_dir
        self.meta_path = self.persist_dir / self.METADATA_FILE
        self._client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False)
        )

    def _get_or_create_collection(self):
        return self._client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )

    def clear_active_document(self) -> None:
        """Clears the currently loaded document vectors and metadata."""
        try:
            self._client.delete_collection(name=self.COLLECTION_NAME)
        except Exception:
            pass  # Collection might not exist yet
        if self.meta_path.exists():
            try:
                self.meta_path.unlink()
            except Exception:
                pass

    def get_active_document_info(self) -> Optional[Dict[str, Any]]:
        """Returns details about the currently indexed document."""
        if not self.meta_path.exists():
            return None
        try:
            with open(self.meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def _save_active_document_info(self, info: Dict[str, Any]) -> None:
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(info, f, indent=2)

    def index_document(
        self,
        chunks: List[Dict[str, Any]],
        filename: str,
        total_pages: int,
        file_size_bytes: int
    ) -> Dict[str, Any]:
        """
        Indexes a newly uploaded PDF, replacing any previously loaded document.
        """
        # Clear previous document
        self.clear_active_document()

        if not chunks:
            raise ValueError("No text chunks available to index.")

        collection = self._get_or_create_collection()
        embedding_manager = get_embedding_manager()

        texts = [chunk["text"] for chunk in chunks]
        embeddings = embedding_manager.embed_documents(texts)
        ids = [chunk["chunk_id"] for chunk in chunks]
        metadatas = [chunk["metadata"] for chunk in chunks]

        # ChromaDB batch addition (in batches of 200 for safety)
        batch_size = 200
        for i in range(0, len(chunks), batch_size):
            end_idx = i + batch_size
            collection.add(
                ids=ids[i:end_idx],
                embeddings=embeddings[i:end_idx],
                documents=texts[i:end_idx],
                metadatas=metadatas[i:end_idx]
            )

        # Format readable file size
        if file_size_bytes < 1024:
            formatted_size = f"{file_size_bytes} B"
        elif file_size_bytes < 1024 * 1024:
            formatted_size = f"{file_size_bytes / 1024:.1f} KB"
        else:
            formatted_size = f"{file_size_bytes / (1024 * 1024):.2f} MB"

        doc_info = {
            "filename": filename,
            "page_count": total_pages,
            "chunk_count": len(chunks),
            "file_size_bytes": file_size_bytes,
            "formatted_file_size": formatted_size,
            "upload_time": datetime.now(timezone.utc).isoformat(),
            "status": "ready"
        }

        self._save_active_document_info(doc_info)
        return doc_info

    def query_similarity(
        self,
        query_embedding: List[float],
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Executes similarity search on the active collection.
        Returns list of matched chunks with metadata and cosine similarity scores.
        """
        try:
            collection = self._client.get_collection(name=self.COLLECTION_NAME)
        except Exception:
            return []

        count = collection.count()
        if count == 0:
            return []

        actual_top_k = min(top_k, count)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=actual_top_k,
            include=["documents", "metadatas", "distances"]
        )

        matched_chunks: List[Dict[str, Any]] = []
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        ids = results.get("ids", [[]])[0]

        for i in range(len(documents)):
            dist = distances[i] if i < len(distances) else 0.0
            # For cosine distance (range 0 to 2), similarity = 1 - (dist / 2) or max(0, 1 - dist)
            # ChromaDB cosine distance is 1 - cosine_similarity
            similarity = max(0.0, min(1.0, 1.0 - dist))

            matched_chunks.append({
                "chunk_id": ids[i] if i < len(ids) else f"chunk_{i}",
                "text": documents[i],
                "document": metadatas[i].get("document", "Unknown"),
                "page": int(metadatas[i].get("page", 1)),
                "similarity_score": round(similarity, 4),
                "distance": round(dist, 4)
            })

        return matched_chunks


_vector_store_manager = VectorStoreManager()


def get_vector_store() -> VectorStoreManager:
    return _vector_store_manager
