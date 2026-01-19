from pathlib import Path
from typing import Optional

from llama_index.core import StorageContext, VectorStoreIndex, load_index_from_storage
from llama_index.core.vector_stores import SimpleVectorStore
from llama_index.core.storage.docstore import SimpleDocumentStore

STORAGE_DIR = Path("storage/restaurant_index")


def _load_index() -> Optional[VectorStoreIndex]:
    if not STORAGE_DIR.exists():
        return None

    storage_context = StorageContext.from_defaults(
        docstore=SimpleDocumentStore.from_persist_path(STORAGE_DIR),
        vector_store=SimpleVectorStore.from_persist_path(STORAGE_DIR),
    )
    return load_index_from_storage(storage_context=storage_context)


_INDEX = _load_index()


def search_menu(query: str) -> str:
    if _INDEX is None:
        return "No menu data is available. Please run the ingestion step first."

    retriever = _INDEX.as_retriever(similarity_top_k=3)
    nodes = retriever.retrieve(query)
    if not nodes:
        return "No relevant menu information found."

    return "\n\n".join(n.text for n in nodes)
