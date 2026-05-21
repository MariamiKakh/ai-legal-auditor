from transformers import AutoTokenizer

_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
_tokenizer = None


def _get_tokenizer():
    global _tokenizer
    if _tokenizer is None:
        _tokenizer = AutoTokenizer.from_pretrained(_MODEL)
    return _tokenizer


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    tokenizer = _get_tokenizer()
    token_ids = tokenizer.encode(text, add_special_tokens=False)

    chunks = []
    start = 0
    while start < len(token_ids):
        end = min(start + chunk_size, len(token_ids))
        chunk = tokenizer.decode(token_ids[start:end], skip_special_tokens=True)
        if chunk.strip():
            chunks.append(chunk.strip())
        if end == len(token_ids):
            break
        start += chunk_size - overlap

    return chunks
