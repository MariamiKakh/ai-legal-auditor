import os
import sys

import pdfplumber

from backend.rag.chunker import chunk_text
from backend.rag.embedder import embed
from backend.rag.store import get_collection

POLICIES_DIR = os.path.join(os.path.dirname(__file__), "..", "documents", "policies")


def load_pdf_text(filepath: str) -> str:
    with pdfplumber.open(filepath) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages)


def main():
    collection = get_collection()

    pdf_files = sorted(f for f in os.listdir(POLICIES_DIR) if f.lower().endswith(".pdf"))
    if not pdf_files:
        print("No PDF files found in", POLICIES_DIR)
        sys.exit(1)

    total_chunks = 0
    for filename in pdf_files:
        filepath = os.path.join(POLICIES_DIR, filename)
        print(f"Processing {filename} ...", flush=True)

        text = load_pdf_text(filepath)
        chunks = chunk_text(text)
        embeddings = embed(chunks)

        ids = [f"{filename}::{i}" for i in range(len(chunks))]
        metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]

        # upsert so re-runs are idempotent
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )

        print(f"  → {len(chunks)} chunks indexed")
        total_chunks += len(chunks)

    print(f"\nFinished. {len(pdf_files)} documents, {total_chunks} total chunks in ChromaDB.")


if __name__ == "__main__":
    main()
