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
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.voice import AgentSession, room_io
from agent import RestaurantAssistant


# Try to import Deepgram plugin (available in newer versions)
# If not available, we'll use string-based configuration
try:
    from livekit.plugins import deepgram
    DEEPGRAM_AVAILABLE = True
except ImportError:
    DEEPGRAM_AVAILABLE = False
    print("Warning: livekit.plugins.deepgram not available. Using string-based Deepgram configuration.")

# Try to import Groq plugin (available in newer versions)
# If not available, we'll use string-based configuration
try:
    from livekit.plugins import groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("Warning: livekit.plugins.groq not available. Using string-based Groq configuration.")


async def restaurant_agent(ctx: JobContext):
    """
    Entry point for the voice agent session.
    
    This function is called when a new agent session is requested.
    It sets up the AgentSession with STT, LLM, TTS, and other components,
    then starts the session with our RestaurantAssistant agent.
    
    Args:
        ctx: Job context containing room information and other session details
    """
    # Create the agent session with:
    # - STT (Speech-to-Text): Deepgram for transcribing user speech
    # - LLM (Large Language Model): Groq with Llama 3.3 70B (free, fast inference)
    # - TTS (Text-to-Speech): Silero ONNX (free, local, no API key required)
    # - VAD (Voice Activity Detection): Silero for detecting when user is speaking
    # Note: Silero TTS runs locally - no API keys needed!
    
    # Configure STT - use plugin if available, otherwise use string
    if DEEPGRAM_AVAILABLE:
        stt_config = deepgram.STTv2(
            model="nova-2", 
            smart_format=True,
        )
        # Configure Deepgram TTS (Aura)
        tts_config = deepgram.TTS(
            model="aura-asteria-en",  # Options: aura-asteria-en (female), aura-orpheus-en (male), etc.
        )
    else:
        # Fallback to string-based configuration for older versions
        stt_config = "deepgram/nova-2"
        # Fallback TTS if plugin/key missing (though DEEPGRAM_AVAILABLE check implies key presence usually)
        tts_config = SileroTTS(language="en", speaker="en_0", sample_rate=16000)
    
    # Configure LLM - use plugin if available, otherwise use string
    if GROQ_AVAILABLE:
        llm_config = groq.LLM(
            model="llama-3.3-70b-versatile",  # Groq model without "groq/" prefix
        )
    else:
        llm_config = "groq"
    
    # Configure VAD - Silero is now standard in livekit.plugins.silero
    # We can use the VAD class from the plugin, or pass an instance to AgentSession
    import livekit.plugins.silero as silero
    vad_config = silero.VAD.load()

    session = AgentSession(
        stt=stt_config,
        llm=llm_config,
        tts=tts_config,
        vad=vad_config,
    )

    # Start the session with:
    # - The room to join (from the job context)
    # - Our RestaurantAssistant agent instance
    await session.start(
        agent=RestaurantAssistant(),
        room=ctx.room,
    )


if __name__ == "__main__":
    # Check environment variables before starting
    print("Checking configuration...")
    
    required_vars = {
        "LIVEKIT_URL": os.getenv("LIVEKIT_URL"),
        "LIVEKIT_API_KEY": os.getenv("LIVEKIT_API_KEY"),
        "LIVEKIT_API_SECRET": os.getenv("LIVEKIT_API_SECRET"),
        "DEEPGRAM_API_KEY": os.getenv("DEEPGRAM_API_KEY"),
        "GROQ_API_KEY": os.getenv("GROQ_API_KEY"),
    }
    
    missing = [name for name, value in required_vars.items() if not value]
    if missing:
        print(f"ERROR: Missing environment variables: {', '.join(missing)}")
        print("   Please check your .env file in the project root.")
        sys.exit(1)
    
    print("OK: All environment variables found")
    print(f"LiveKit URL: {os.getenv('LIVEKIT_URL')}")
    print("Starting agent server...")
    print("   (This will connect to LiveKit Cloud - requires internet)")
    print("   Press Ctrl+C to stop\n")
    
    # Create worker options with the entrypoint function
    # This manages the lifecycle of agent sessions
    opts = WorkerOptions(entrypoint_fnc=restaurant_agent)
    
    # Run the agent server using LiveKit's CLI
    # This handles command-line arguments like 'dev', 'start', 'console', etc.
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
