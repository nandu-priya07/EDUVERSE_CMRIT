import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.rag.loader import load_pdf
from app.rag.chunker import TextChunker
from app.rag.vectorstore import get_vector_store
from app.rag.retriever import get_retriever
from app.rag.generator import get_generator

def test_pipeline():
    pdf_path = Path("sample_documents/data_structures_guide.pdf")
    assert pdf_path.exists(), "Sample PDF not found!"
    print(f"[1] Loading PDF from {pdf_path}...")

    pages = load_pdf(pdf_path, "data_structures_guide.pdf")
    print(f"    Loaded {len(pages)} pages.")
    assert len(pages) == 5, f"Expected 5 pages, got {len(pages)}"

    print("[2] Chunking pages...")
    chunker = TextChunker(chunk_size=500, chunk_overlap=100)
    chunks = chunker.chunk_document_pages(pages)
    print(f"    Generated {len(chunks)} chunks.")
    assert len(chunks) > 0, "No chunks generated"

    print(f"    Sample chunk metadata: {chunks[0]['metadata']}")

    print("[3] Indexing chunks in ChromaDB...")
    vector_store = get_vector_store()
    doc_info = vector_store.index_document(
        chunks=chunks,
        filename="data_structures_guide.pdf",
        total_pages=len(pages),
        file_size_bytes=pdf_path.stat().st_size
    )
    print(f"    Indexed doc info: {doc_info}")

    print("[4] Testing Retrieval with question: 'What is an AVL tree and who invented it?'")
    retriever = get_retriever()
    results = retriever.retrieve("What is an AVL tree and who invented it?", top_k=3)
    print(f"    Retrieved {len(results)} chunks:")
    for r in results:
        print(f"    - Page {r['page']} (Similarity: {r['similarity_score']}): {r['text'][:90]}...")
    assert any("AVL tree" in r["text"] for r in results), "AVL tree not found in top retrieved chunks!"

    print("[5] Testing Generator with question: 'What is an AVL tree?'")
    generator = get_generator()
    answer, debug_info = generator.generate_answer("What is an AVL tree?", results)
    print(f"\n--- Generated Answer ---\n{answer}\n")
    print(f"Debug Info: {debug_info}")

    print("[6] Testing Out-of-Context Question: 'What is the recipe for baking chocolate cookies?'")
    results_unrelated = retriever.retrieve("What is the recipe for baking chocolate cookies?", top_k=3)
    answer_unrelated, _ = generator.generate_answer("What is the recipe for baking chocolate cookies?", results_unrelated)
    print(f"\n--- Out-of-Context Answer ---\n{answer_unrelated}\n")

    print("[OK] RAG Pipeline verification passed successfully!")

if __name__ == "__main__":
    test_pipeline()
