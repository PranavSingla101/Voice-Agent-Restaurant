"""
Server setup and session configuration for the restaurant voice agent.

This module handles:
- Agent server creation
- Session configuration (STT, LLM, TTS, VAD)
- Room options and audio processing
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli, inference
from livekit.agents import AgentSession, room_io
from livekit.plugins import groq, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from agent import RestaurantAssistant

# Deepgram code commented out as requested
# try:
#     from livekit.plugins import deepgram
#     DEEPGRAM_AVAILABLE = True
# except ImportError:
#     DEEPGRAM_AVAILABLE = False


async def restaurant_agent(ctx: JobContext):
    """
    Entry point for the voice agent session.
    """
    # Create the agent session with standard configuration:
    # - STT: AssemblyAI (via LiveKit Inference)
    # - LLM: Groq (via Plugin)
    # - TTS: Cartesia (via LiveKit Inference)
    
    # Pre-load VAD
    vad_model = silero.VAD.load()

    session = AgentSession(
        stt=inference.STT(model="assemblyai/universal-streaming", language="en"),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
            language="en"
        ),
        turn_detection=MultilingualModel(),
        vad=vad_model,
        preemptive_generation=True,
    )

    # Start the session
    await session.start(
        agent=RestaurantAssistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony() if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP else noise_cancellation.BVC(),
            ),
        ),
    )


if __name__ == "__main__":
    # Check environment variables before starting
    print("Checking configuration...")
    
    required_vars = {
        "LIVEKIT_URL": os.getenv("LIVEKIT_URL"),
        "LIVEKIT_API_KEY": os.getenv("LIVEKIT_API_KEY"),
        "LIVEKIT_API_SECRET": os.getenv("LIVEKIT_API_SECRET"),
        "GROQ_API_KEY": os.getenv("GROQ_API_KEY"),
        # "DEEPGRAM_API_KEY": os.getenv("DEEPGRAM_API_KEY"), # Commented out
    }
    
    missing = [name for name, value in required_vars.items() if not value]
    if missing:
        print(f"ERROR: Missing environment variables: {', '.join(missing)}")
        print("   Please check your .env file in the project root.")
        sys.exit(1)
    
    print("OK: All environment variables found")
    print(f"LiveKit URL: {os.getenv('LIVEKIT_URL')}")
    print("Starting agent server...")
    
    opts = WorkerOptions(entrypoint_fnc=restaurant_agent)
    
    try:
        cli.run_app(opts)
    except KeyboardInterrupt:
        print("\n\nAgent server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
