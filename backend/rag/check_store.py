from backend.rag.store import get_collection


def main():
    collection = get_collection()
    count = collection.count()
    print(f"ChromaDB 'policies' collection: {count} chunks stored.")

    if count > 0:
        sample = collection.peek(limit=3)
        print("\nSample entries:")
        for doc, meta in zip(sample["documents"], sample["metadatas"]):
            preview = doc[:120].replace("\n", " ")
            print(f"  [{meta['source']} · chunk {meta['chunk_index']}] {preview}...")


if __name__ == "__main__":
    main()
