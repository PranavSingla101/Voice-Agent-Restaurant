import os
from pathlib import Path

from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.storage import StorageContext
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.core.vector_stores import SimpleVectorStore


DATA_DIR = Path("data/company_docs")
STORAGE_DIR = Path("storage/restaurant_index")


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
