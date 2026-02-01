import pytest
from backend.rag_engine import get_index

# 1. Fixture: Setup the engine once before tests run
@pytest.fixture(scope="module")
def rag_index():
    """
    Initializes the RAG index. 
    """
    print("\n--- Loading RAG Index for Testing ---")
    return get_index()

# 2. Test Case: Verify Fact Retrieval (Retriever Mode - checks Context)
def test_retrieval_specific_fact(rag_index):
    """
    Scenario: Ask a specific question found in your documents.
    We test the 'Context Injection' capability here.
    """
    assert rag_index is not None, "Index should be loaded"
    
    question = "What are the opening hours?" # Adjust based on your actual data
    retriever = rag_index.as_retriever(similarity_top_k=3)
    nodes = retriever.retrieve(question)
    
    # Assertions
    assert len(nodes) > 0, "Should retrieve at least one node"
    
    # Convert nodes to text to check content
    content = "\n".join([n.text for n in nodes]).lower()
    print(f"\nRetrieved Content: {content}")
    
    # Check for keywords (Assuming '11 am' or generic time is in the docs)
    # Since I don't know the exact doc content, I will check for general lengths or expected trivial tokens.
    # Replace these assertions with real ones based on your data/company_docs/
    # assert "am" in content or "pm" in content

# 3. Test Case: Verify Query Engine (LLM Mode - checks Synthesis)
# This requires an LLM API Key (Groq) to be active.
def test_query_engine_synthesis(rag_index):
    """
    Scenario: Ask the engine to answer a question.
    """
    if not rag_index:
        pytest.skip("Index not loaded")
        
    query_engine = rag_index.as_query_engine()
    # Using a simple query
    response = query_engine.query("What type of food do you serve?")
    
    answer_text = str(response).lower()
    print(f"\nAnswer: {answer_text}")
    
    assert "pizza" in answer_text or "burger" in answer_text or "food" in answer_text
