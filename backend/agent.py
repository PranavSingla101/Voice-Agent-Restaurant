import os
from typing import Tuple

from dotenv import load_dotenv
from livekit.agents import VoiceAssistant
from rag import search_menu

from openai import OpenAI
from groq import Groq


load_dotenv()

COMPANY_NAME = os.getenv("COMPANY_NAME", "The Pizzeria, Delhi")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def _init_llm() -> Tuple[object, str]:
    """
    Returns (llm_client, model_name).
    Prefers Groq (Llama 3) if GROQ_API_KEY is set, otherwise OpenAI.
    """
    if GROQ_API_KEY:
        return Groq(api_key=GROQ_API_KEY), "llama-3.1-8b-instant"
    if OPENAI_API_KEY:
        return OpenAI(api_key=OPENAI_API_KEY), "gpt-4o-mini"
    raise RuntimeError("No LLM API key found. Set GROQ_API_KEY or OPENAI_API_KEY.")


LLM_CLIENT, LLM_MODEL = _init_llm()


async def run_agent():
    # Note: this uses the simple VoiceAssistant helper; adjust to AgentSession if needed.
    llm_name = "groq" if GROQ_API_KEY else "openai"
    assistant = VoiceAssistant(
        stt="deepgram",
        tts="deepgram",
        llm=llm_name,
        on_message=handle_message,
    )
    await assistant.start()


async def handle_message(text: str) -> str:
    context = search_menu(text)
    system_prompt = f"""
You are a friendly restaurant ordering assistant for {COMPANY_NAME}.
Your job: help the customer place pickup or delivery orders using ONLY the menu and rules in context.
- Never invent items or prices. If unavailable, say so and suggest alternatives.
- Ask clarifying questions (size, toppings, quantity, pickup vs delivery).
- Confirm the final order and total before placing.
- Be concise and polite.

MENU & RULES CONTEXT:
{context}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": text},
    ]

    response = LLM_CLIENT.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
    )

    return response.choices[0].message.content


if __name__ == "__main__":
    import asyncio

    asyncio.run(run_agent())
