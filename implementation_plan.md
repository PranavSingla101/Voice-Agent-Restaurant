# Implementation Plan: LiveKit Agents 1.0 Refactor & Testing

## 1. Migration to AgentSession
- **Status**: ✅ **Already Adopted**
- **Verification**: The codebase currently uses `AgentSession` and `Agent` classes in `backend/agent.py` and `backend/server.py`. The deprecated `VoicePipelineAgent` is not present.
- **Action**: No major migration needed, but we will refine the `AgentSession` instantiation to Ensure strict adherence to 1.0 best practices (e.g., ensuring `AgentSession` is properly managing the loop).

## 2. Pipeline Nodes & Context Management
- **Status**: ⚠️ **Needs Review**
- **Analysis**: The current code uses `on_user_turn_completed` to inject RAG context. This is a valid event-driven pattern. The user requested "nodes" over "callbacks". In LiveKit Agents 1.0, the `AgentSession` *is* the pipeline. We will ensure that we aren't using legacy callbacks like `before_llm_cb`.
- **Action**: 
    - Verify `on_user_turn_completed` usage is optimal. 
    - Ensure `ChatContext` is used for all message history manipulation.
    - We will stick to the event-driven `on_user_turn_completed` for RAG context injection as it is the cleanest way to interact with the `ChatContext` before the LLM generates a reply.

## 3. RAG Refactoring & Testing (Priority)
- **Status**: ❌ **Missing Testing Layer**
- **Action**:
    - **Refactor**: Extract RAG logic from `backend/rag.py` (and `agent.py`) into a testable `backend/rag_engine.py`.
    - **Isolation**: Ensure `get_query_engine()` can be called without starting the LiveKit server.
    - **Testing**: Create `tests/` directory with:
        - `conftest.py`: For environment loading.
        - `test_rag.py`: Unit tests for retrieval accuracy and "don't know" scenarios.
    - **Tooling**: Add `pytest` and `pytest-asyncio` to requirements.

## 4. Error Handling & Robustness
- **Status**: ⚠️ **Basic**
- **Action**:
    - Wrap the `cli.run_app` in `server.py` with robust `try/except` blocks.
    - Add connection retry logic or grace period handling if applicable (though `cli.run_app` handles much of this, we can add wrapper logic).

## 5. Dependency Management
- **Action**: Recommend `uv` for package management. We will add a section to `README.md` or `STARTUP_COMMANDS.md` on how to use `uv`.

## Execution Steps
1.  **Refactor RAG**: Create `backend/rag_engine.py` and decouple from global state.
2.  **Create Tests**: Implement `tests/test_rag.py` and `tests/conftest.py`.
3.  **Update Agent**: Modify `backend/agent.py` to use the new `rag_engine`.
4.  **Update Requirements**: Add testing dependencies.
5.  **Verify**: Run `pytest` to validate RAG logic independently of the voice agent.
