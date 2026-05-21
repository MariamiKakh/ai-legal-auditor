import chromadb

from backend.config import CHROMA_PERSIST_DIR

COLLECTION_NAME = "policies"
_client = None


def get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    return _client


def get_collection() -> chromadb.Collection:
    return get_client().get_or_create_collection(name=COLLECTION_NAME)
