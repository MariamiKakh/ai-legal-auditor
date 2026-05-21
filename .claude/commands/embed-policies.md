---
name: embed-policies
description: Process all policy PDFs and load them into ChromaDB vector database
invocation: user
---

## Task
Read CLAUDE.md for full project context before starting.

Process all PDF files in `backend/documents/policies/` and load them into the ChromaDB vector database:

1. Read each PDF from `backend/documents/policies/`
2. Split text into chunks of 512 tokens with 50 token overlap
3. Generate embeddings using sentence-transformers
4. Store in ChromaDB at `backend/chroma_db/`
5. Confirm how many documents and chunks were indexed

## Constraints
- Use the RAG pipeline code in `backend/rag/`
- Do not modify existing policy PDF files
- Print progress as each file is processed