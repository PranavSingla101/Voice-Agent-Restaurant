import os
from pathlib import Path

from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, Settings
from llama_index.core.storage import StorageContext
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.core.vector_stores import SimpleVectorStore

# Get project root (one level up from backend directory)
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "company_docs"
STORAGE_DIR = PROJECT_ROOT / "storage" / "restaurant_index"

# Configure local embedding model (no API key required)
# Try to use local embeddings, fallback to HuggingFace if needed
try:
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="BAAI/bge-small-en-v1.5"
    )
except ImportError:
    # If HuggingFace embeddings not available, try to use local default
    # This will require llama-index-embeddings-huggingface package
    print("Warning: HuggingFace embeddings not available. Install with: pip install llama-index-embeddings-huggingface")
    raise


def main() -> None:
    if not DATA_DIR.exists():
        raise SystemExit(f"Data directory not found: {DATA_DIR.resolve()}")

    documents = SimpleDirectoryReader(str(DATA_DIR)).load_data()
    if not documents:
        raise SystemExit("No documents found to index. Add menu/rules docs to data/company_docs.")

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    docstore = SimpleDocumentStore()
    vector_store = SimpleVectorStore()
    storage_context = StorageContext.from_defaults(
        docstore=docstore,
        vector_store=vector_store,
    )

    VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        show_progress=True,
    )

    # Persist to disk for later retrieval
    storage_context.persist(persist_dir=str(STORAGE_DIR))
    print(f"✅ Restaurant knowledge indexed and saved to {STORAGE_DIR.resolve()}")


if __name__ == "__main__":
    main()
