"""
Helper functions for display operations.
"""

from image_mapping import get_image_path
from .message_sender import send_data_message


async def handle_show_menu_item(agent_instance, item_name: str) -> str:
    """
    Handle showing a menu item visually.
    
    Args:
        agent_instance: The agent instance
        item_name: The name of the menu item to display
    
    Returns:
        A message confirming the item is being shown
    """
    # Get the image path for the menu item
    image_path = get_image_path(item_name)
    
    if not image_path:
        return f"I don't have an image available for {item_name}. Let me describe it to you instead."
    
    # Get the room from the session
    room = agent_instance.session.room
    if not room:
        return f"I found {item_name}, but I'm having trouble displaying it right now."
    
    # Send data message to frontend
    success = await send_data_message(
        room=room,
        message_type="show_item",
        data={
            "imagePath": image_path,
            "itemName": item_name,
        },
    )
    
    if success:
        return f"You can view the {item_name} on your left."
    else:
        return f"I found {item_name}, but I'm having trouble displaying it right now."
