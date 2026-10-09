import logging
import re
from typing import List, Dict, Any, Tuple
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a document question-answering assistant.

Answer the user's question ONLY using the provided document context.

Do not use outside knowledge.

If the answer cannot be found in the provided context, say:
'I couldn't find this information in the uploaded document.'

Do not invent facts.

When possible, provide the relevant page number."""


class Generator:
    """
    Generates grounded answers based strictly on retrieved PDF document chunks.
    Supports Google Gemini, OpenAI, and a fallback local extractor if no API key is configured.
    """
    def __init__(self):
        self.settings = get_settings()

    def _format_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Formats retrieved chunks with page metadata into a clear context string."""
        context_parts = []
        for i, chunk in enumerate(chunks, start=1):
            page = chunk.get("page", "Unknown")
            text = chunk.get("text", "").strip()
            chunk_id = chunk.get("chunk_id", f"chunk_{i}")
            context_parts.append(
                f"[Chunk {i} | Page {page} | ID {chunk_id}]\n{text}"
            )
        return "\n\n---\n\n".join(context_parts)

    def _generate_with_gemini(self, question: str, context: str) -> str:
        """Generates answer using Google Gemini API."""
        api_key = self.settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        prompt = f"""Context from uploaded document:
=========================================
{context}
=========================================

User Question: {question}

Please answer the question based strictly and exclusively on the context above. If the context does not contain enough information to answer the question, respond with: 'I couldn't find this information in the uploaded document.'"""

        response = client.models.generate_content(
            model=self.settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.1,  # Low temperature for deterministic, grounded answers
            )
        )
        return response.text.strip() if response.text else "I couldn't find this information in the uploaded document."

    def _generate_with_openai(self, question: str, context: str) -> str:
        """Generates answer using OpenAI API."""
        api_key = self.settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not configured.")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Context from uploaded document:\n{context}\n\nQuestion: {question}"
                }
            ],
            "temperature": 0.1
        }

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()

    def _generate_with_fallback(self, question: str, chunks: List[Dict[str, Any]]) -> str:
        """
        Extractive local fallback when no LLM API key has been set yet.
        Checks for semantic and lexical relevance, and extracts matching sentences.
        """
        if not chunks:
            return "I couldn't find this information in the uploaded document."

        # Filter keywords from question (excluding stopwords)
        stopwords = {"what", "is", "the", "a", "an", "and", "or", "in", "of", "to", "for", "with", "on", "at", "by", "from", "how", "why", "where", "when", "who", "which", "does", "do", "did", "can", "could", "would", "tell", "me", "about"}
        words = re.findall(r"\b[a-zA-Z0-9_-]+\b", question.lower())
        keywords = [w for w in words if w not in stopwords and len(w) > 2]

        matching_sentences = []
        source_pages_found = set()

        for chunk in chunks:
            text = chunk.get("text", "")
            page = chunk.get("page", 1)
            # Split into sentences
            sentences = re.split(r"(?<=[.!?])\s+", text)
            for s in sentences:
                s_lower = s.lower()
                matches = sum(1 for kw in keywords if kw in s_lower)
                if matches > 0:
                    matching_sentences.append((matches, s.strip(), page))
                    source_pages_found.add(page)

        if not matching_sentences:
            return "I couldn't find this information in the uploaded document."

        matching_sentences.sort(key=lambda x: x[0], reverse=True)
        top_sentences = [s[1] for s in matching_sentences[:3]]
        pages_str = ", ".join(f"Page {p}" for p in sorted(source_pages_found))

        extracted_text = " ".join(top_sentences)
        return (
            f"{extracted_text}\n\n"
            f"[Source: {pages_str}]\n\n"
            f"*(Note: Powered by local semantic search. To enable AI generative synthesis, add your GEMINI_API_KEY in backend/.env)*"
        )

    def generate_answer(
        self,
        question: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Coordinates generation using retrieved chunks.
        Returns: (answer_string, debug_metadata)
        """
        if not retrieved_chunks:
            return (
                "I couldn't find this information in the uploaded document.",
                {"context_used": "", "provider": "none", "reason": "No relevant chunks retrieved."}
            )

        context_str = self._format_context(retrieved_chunks)
        provider = self.settings.LLM_PROVIDER.lower()
        debug_info = {
            "provider": provider,
            "chunk_count": len(retrieved_chunks),
            "context_length_chars": len(context_str),
            "retrieved_chunk_ids": [c.get("chunk_id") for c in retrieved_chunks],
        }

        try:
            if provider == "gemini" and self.settings.GEMINI_API_KEY:
                debug_info["model"] = self.settings.GEMINI_MODEL
                answer = self._generate_with_gemini(question, context_str)
            elif provider == "openai" and self.settings.OPENAI_API_KEY:
                debug_info["model"] = self.settings.OPENAI_MODEL
                answer = self._generate_with_openai(question, context_str)
            else:
                debug_info["model"] = "local-extractive-fallback"
                answer = self._generate_with_fallback(question, retrieved_chunks)

            return answer, debug_info

        except Exception as e:
            logger.error(f"Error generating answer with {provider}: {str(e)}", exc_info=True)
            # Graceful fallback to extractive if API quota or connection fails
            fallback_answer = self._generate_with_fallback(question, retrieved_chunks)
            debug_info["error"] = str(e)
            debug_info["fallback_used"] = True
            return fallback_answer, debug_info


_generator = Generator()


def get_generator() -> Generator:
    return _generator
