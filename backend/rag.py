from pathlib import Path
from typing import Optional

from llama_index.core import StorageContext, VectorStoreIndex, load_index_from_storage, Settings
from llama_index.core.vector_stores import SimpleVectorStore
from llama_index.core.storage.docstore import SimpleDocumentStore

# Get project root (one level up from backend directory)
PROJECT_ROOT = Path(__file__).parent.parent
STORAGE_DIR = PROJECT_ROOT / "storage" / "restaurant_index"

# Configure local embedding model (must match the one used in ingest.py)
try:
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="BAAI/bge-small-en-v1.5"
    )
except ImportError:
    # If HuggingFace embeddings not available, this will use default
    # Make sure to use the same embedding model as in ingest.py
    pass


def _load_index() -> Optional[VectorStoreIndex]:
    if not STORAGE_DIR.exists():
        return None

    try:
        # Load storage context from persisted directory
        # Use from_defaults with persist_dir to load from disk
        storage_context = StorageContext.from_defaults(
            persist_dir=str(STORAGE_DIR)
        )
        return load_index_from_storage(storage_context=storage_context)
    except Exception as e:
        # If loading fails, return None (will show "No menu data available")
        print(f"Warning: Could not load RAG index: {e}")
        return None


_INDEX = _load_index()


def search_menu(query: str) -> str:
    if _INDEX is None:
        return "No menu data is available. Please run the ingestion step first."

    retriever = _INDEX.as_retriever(similarity_top_k=3)
    nodes = retriever.retrieve(query)
    if not nodes:
        return "No relevant menu information found."

    return "\n\n".join(n.text for n in nodes)
