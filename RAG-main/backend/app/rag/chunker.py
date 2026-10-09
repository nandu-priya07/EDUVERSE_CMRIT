import re
from typing import List, Dict, Any


class TextChunker:
    """
    Splits text into coherent chunks respecting paragraph, sentence, and word boundaries.
    Avoids mid-sentence splits while ensuring overlap between contiguous chunks.
    """
    def __init__(self, chunk_size: int = 600, chunk_overlap: int = 120):
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be strictly less than chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        # Priority order of split separators
        self.separators = ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " "]

    def _split_text_with_separator(self, text: str, separator: str) -> List[str]:
        if not separator:
            return list(text)
        if separator in [". ", "? ", "! ", "; "]:
            # Keep punctuation with preceding segment
            pattern = f"({re.escape(separator.strip())}\\s+)"
            parts = re.split(pattern, text)
            combined = []
            i = 0
            while i < len(parts):
                segment = parts[i]
                if i + 1 < len(parts):
                    segment += parts[i + 1]
                    i += 1
                if segment:
                    combined.append(segment)
                i += 1
            return combined
        return text.split(separator)

    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        """Recursively split text into segments within target chunk size."""
        final_chunks: List[str] = []
        if not separators or len(text) <= self.chunk_size:
            if text.strip():
                final_chunks.append(text.strip())
            return final_chunks

        current_sep = separators[0]
        remaining_seps = separators[1:]
        splits = self._split_text_with_separator(text, current_sep)

        good_splits: List[str] = []
        for s in splits:
            if len(s) < self.chunk_size:
                good_splits.append(s)
            else:
                if remaining_seps:
                    other_splits = self._recursive_split(s, remaining_seps)
                    good_splits.extend(other_splits)
                else:
                    # Hard truncate fallback if no separators left
                    for i in range(0, len(s), self.chunk_size - self.chunk_overlap):
                        chunk = s[i:i + self.chunk_size].strip()
                        if chunk:
                            good_splits.append(chunk)

        # Merge segments into chunks with overlap
        current_chunk = ""
        for seg in good_splits:
            candidate = f"{current_chunk} {seg}".strip() if current_chunk else seg
            if len(candidate) <= self.chunk_size:
                current_chunk = candidate
            else:
                if current_chunk:
                    final_chunks.append(current_chunk)
                # Compute overlap for the next chunk
                if self.chunk_overlap > 0 and current_chunk:
                    overlap_seed = current_chunk[-self.chunk_overlap:]
                    # Try to start overlap at a word boundary
                    space_idx = overlap_seed.find(" ")
                    if space_idx != -1:
                        overlap_seed = overlap_seed[space_idx + 1:]
                    current_chunk = f"{overlap_seed} {seg}".strip()
                else:
                    current_chunk = seg

        if current_chunk:
            final_chunks.append(current_chunk)

        return final_chunks

    def chunk_document_pages(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Chunks all pages of a document while preserving page metadata and generating unique chunk IDs.
        
        Input pages:
        [
            {"document": "report.pdf", "page": 1, "text": "..."},
            ...
        ]
        
        Output chunks:
        [
            {
                "chunk_id": "chunk_1",
                "text": "...",
                "metadata": {
                    "document": "report.pdf",
                    "page": 1,
                    "chunk_id": "chunk_1",
                    "total_pages": 12,
                    "char_count": 543
                }
            },
            ...
        ]
        """
        all_chunks: List[Dict[str, Any]] = []
        global_chunk_counter = 1
        total_pages = len(pages)

        for page_data in pages:
            doc_name = page_data["document"]
            page_num = page_data["page"]
            text = page_data["text"]

            if not text.strip():
                continue

            page_splits = self._recursive_split(text, self.separators)

            for split_text in page_splits:
                cleaned = split_text.strip()
                if not cleaned:
                    continue

                chunk_id = f"chunk_{global_chunk_counter}"
                all_chunks.append({
                    "chunk_id": chunk_id,
                    "text": cleaned,
                    "metadata": {
                        "document": doc_name,
                        "page": int(page_num),
                        "chunk_id": chunk_id,
                        "total_pages": int(total_pages),
                        "char_count": len(cleaned)
                    }
                })
                global_chunk_counter += 1

        return all_chunks
