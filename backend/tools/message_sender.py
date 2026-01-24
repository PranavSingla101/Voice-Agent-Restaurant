"""
Utility functions for sending data messages to the frontend.
"""

import json
from typing import Dict, Any, Optional
from livekit import rtc


async def send_data_message(
    room: Optional[rtc.Room],
    message_type: str,
    data: Dict[str, Any],
    topic: str = "animation",
) -> bool:
    """
    Send a data message to all participants in the room.
    
    Args:
        room: The LiveKit room instance
        message_type: Type of message (e.g., "add_to_cart", "navigate_to_menu")
        data: Additional data to include in the message
        topic: Message topic (default: "animation")
    
    Returns:
        True if message was sent successfully, False otherwise
    """
    if not room:
        return False
    
    try:
        data_message = {
            "type": message_type,
            **data,
        }
        
        await room.local_participant.publish_data(
            json.dumps(data_message).encode("utf-8"),
            topic=topic,
            reliable=True,
        )
        return True
    except Exception as e:
        print(f"Error sending data message ({message_type}): {e}")
        return False
