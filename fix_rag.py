import shutil
import sys
from pathlib import Path
import os

# Add the backend directory to path so we can import from rag_engine
sys.path.append(os.path.join(os.getcwd(), 'backend'))

def fix_rag():
    print("Checking environment...")
    try:
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
        print("SUCCESS: llama-index-embeddings-huggingface is importable.")
    except ImportError as e:
        print(f"ERROR: Could not import HuggingFaceEmbedding: {e}")
        print("Please run: pip install llama-index-embeddings-huggingface")
        sys.exit(1)

    # Path to storage
    storage_path = Path("storage/restaurant_index")
    if storage_path.exists():
        print(f"Removing existing storage at {storage_path} to force rebuild...")
        try:
            shutil.rmtree(storage_path)
            print("Storage removed.")
        except Exception as e:
            print(f"Error removing storage: {e}")
            sys.exit(1)
    else:
        print("No existing storage found.")

    print("Rebuilding index...")
    try:
        # Import after path fix
        from backend.rag_engine import get_index
        # get_index will call init_settings and rebuild if storage is missing
        index = get_index()
        if index:
            print("SUCCESS: Index rebuilt and loaded successfully.")
        else:
            print("FAILURE: get_index returned None.")
    except Exception as e:
        print(f"CRITICAL ERROR during index rebuild: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_rag()
