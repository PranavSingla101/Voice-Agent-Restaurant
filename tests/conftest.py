import pytest
from dotenv import load_dotenv
import os
import sys
from pathlib import Path

# Add the backend directory to sys.path so we can import modules from it
BACKEND_DIR = Path(__file__).parent.parent / "backend"
sys.path.append(str(BACKEND_DIR.parent))

@pytest.fixture(scope="session", autouse=True)
def load_env():
    # Load .env file from project root
    project_root = Path(__file__).parent.parent
    load_dotenv(project_root / ".env")
    
    # Verify critical keys exist before running tests
    # Note: We are using Groq, so check that instead of OpenAI if we were testing LLM calls directly.
    # However, testing purely retrieval might not need LLM key if using local embeddings.
    # But if tests use .query() (QueryEngine), it needs an LLM.
    if not os.getenv("GROQ_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print("Warning: No LLM API Key found. Query tests might fail if they require synthesis.")
