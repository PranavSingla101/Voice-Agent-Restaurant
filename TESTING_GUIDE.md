# How to Test the Voice Agent

This guide explains how to run the automated test suite for the Restaurant Voice Agent. We use **pytest** to verify the logic of critical components (like the RAG engine) without needing to run the full voice server.

## 1. Prerequisites

Ensure your environment is set up and dependencies are installed.

```powershell
.\voice_agent\Scripts\Activate.ps1
pip install pytest pytest-asyncio
```

**Environment Variables:**
Your `.env` file must contain your valid API keys, specifically:
- `GROQ_API_KEY`: Required for testing the LLM's ability to answer questions.
- `LIVEKIT_URL` / `API_KEY`: (Optional for unit tests, but good practice).

## 2. Running the Tests

To run all tests with verbose output (showing exactly which tests pass):

```powershell
pytest tests/ -v
```

### Expected Output
You should see green passing indicators:
```text
tests/test_rag.py::test_retrieval_specific_fact PASSED
tests/test_rag.py::test_query_engine_synthesis PASSED
```

## 3. What We Are Testing

The test suite is located in the `tests/` directory.

### `tests/test_rag.py`

This file tests the **Retrieval Augmented Generation (RAG)** logic, which is the "brain" of the agent that searches the menu.

1.  **`test_retrieval_specific_fact`**
    *   **Goal**: Verify that the system can *find* the right information in your uploaded documents.
    *   **How**: It asks "What are the opening hours?" (or similar) and checks if the *retrieved text chunks* contain relevant keywords.
    *   **Why**: This ensures that when a user speaks, the agent actually "sees" the correct part of the menu before trying to answer.

2.  **`test_query_engine_synthesis`**
    *   **Goal**: Verify that the LLM (Groq) can *read* the retrieved info and *formulate* a human-like answer.
    *   **How**: It asks "What type of food do you serve?" and checks the final string response for keywords like "pizza" or "burger".
    *   **Why**: This confirms that your API Key is working, the LLM is responsive, and it is correctly grounded in the provided context (avoiding hallucinations).

### `tests/conftest.py`

This is a configuration file that:
*   Automatically loads your `.env` variables before tests start.
*   Sets up the python path so the tests can import your `backend` code easily.

## 4. Troubleshooting

*   **`ModuleNotFoundError`**: Run the tests from the project root directory (where this file is).
*   **`GROQ_API_KEY not found`**: Ensure your `.env` file is in the project root and is not empty.
*   **"No menu data is available"**: You might need to run the ingestion script first to build the index:
    ```powershell
    python backend/ingest.py
    ```
