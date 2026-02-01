import os
from pathlib import Path
from typing import Optional

from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    StorageContext,
    load_index_from_storage,
    Settings,
)

# Constants
PROJECT_ROOT = Path(__file__).parent.parent
STORAGE_DIR = PROJECT_ROOT / "storage" / "restaurant_index"
DATA_DIR = PROJECT_ROOT / "data" / "company_docs"

def init_settings():
    # 1. Embeddings
    try:
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
        Settings.embed_model = HuggingFaceEmbedding(
            model_name="BAAI/bge-small-en-v1.5"
        )
    except ImportError as e:
        print(f"CRITICAL: Failed to load HuggingFace embeddings: {e}")
        # Don't default to OpenAI - define explicit failure behavior or allow execution to fail naturally 
        # but cleanly. By setting to None, we force an error if embedding is attempted, 
        # validating that we aren't silently using OpenAI.
        Settings.embed_model = None

    # 2. LLM
    # Explicitly disable OpenAI default to prevent API key errors during initialization
    Settings.llm = None 

def get_index() -> Optional[VectorStoreIndex]:
    """
    Loads the index from disk. Unlike the ingest script, this function responsible 
    for providing the index object to consumers (Agent or Tests).
    """
    init_settings()  # Ensure configured before loading
    if not STORAGE_DIR.exists():
        # If storage doesn't exist, we could try to build it, or just return None.
        # For a robust production app, we might expect the build step to have happened.
        # But if we want to follow the user's 'rag_engine' pattern which auto-builds:
        if DATA_DIR.exists():
            print("Storage not found. Attempting to build index from data...")
            documents = SimpleDirectoryReader(str(DATA_DIR)).load_data()
            if not documents:
                return None
            
            index = VectorStoreIndex.from_documents(documents)
            # Ensure parent storage dir exists
            STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            index.storage_context.persist(persist_dir=str(STORAGE_DIR))
            return index
        return None

    try:
        storage_context = StorageContext.from_defaults(persist_dir=str(STORAGE_DIR))
        index = load_index_from_storage(storage_context=storage_context)
        return index
    except Exception as e:
        print(f"Error loading index: {e}")
        return None
