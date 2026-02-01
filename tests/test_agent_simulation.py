import pytest
from llama_index.core.tools import FunctionTool
from llama_index.llms.groq import Groq

# We define a real simple function so the LLM can see a valid signature/schema.
# A MagicMock might not provide the necessary schema info for the LLM to formulate a tool call.
def get_company_info(query: str) -> str:
    """Use this to answer questions about the company, such as pricing, hours, or services."""
    return "The subscription costs $50/month."

@pytest.fixture
def mock_rag_tool():
    # Wrap the function in a FunctionTool
    tool = FunctionTool.from_defaults(
        fn=get_company_info,
        name="company_knowledge_base",
        description="Use this to answer questions about the company."
    )
    return tool

@pytest.mark.asyncio
async def test_agent_selects_rag_tool(mock_rag_tool):
    """
    Simulate the LLM decision process.
    We are testing: If user asks 'price', does LLM choose 'company_knowledge_base'?
    """
    
    # 1. Setup the LLM (Groq)
    # Ensure GROQ_API_KEY is in your .env or environment
    llm = Groq(model="llama-3.3-70b-versatile")
    
    user_input = "How much does the subscription cost?"
    
    # 2. Force the LLM to choose a tool
    # apredict_and_call will:
    #   a. Send user_input + tool definitions to LLM
    #   b. LLM generates a tool call
    #   c. LlamaIndex executes the tool (our mock function)
    #   d. The result is passed back to LLM for final answer
    response = await llm.apredict_and_call(
        [mock_rag_tool], 
        user_input, 
        verbose=True
    )
    
    print(f"\nAgent Response: {response.response}")

    # 3. Assertions
    # Did the LLM actually decide to call our tool? 
    # The final response should incorporate the tool output ($50/month).
    response_text = str(response.response).lower()
    
    assert "$50" in response_text or "50 dollars" in response_text or "50/month" in response_text
