"""
Helper functions for navigation operations.
"""

from .message_sender import send_data_message


async def handle_go_to_menu(agent_instance) -> str:
    """Handle navigating back to the menu page."""
    room = agent_instance.session.room
    if not room:
        return "I'm having trouble processing your request right now. Please try again."
    
    success = await send_data_message(
        room=room,
        message_type="navigate_to_menu",
        data={},
    )
    
    if success:
        return "Taking you back to the menu now."
    else:
        return "I'm having trouble navigating right now. Please try again."


async def handle_cancel_payment(agent_instance) -> str:
    """Handle cancelling the payment process."""
    room = agent_instance.session.room
    if not room:
        return "I'm having trouble processing your request right now. Please try again."
    
    success = await send_data_message(
        room=room,
        message_type="cancel_payment",
        data={},
    )
    
    if success:
        return "Payment cancelled. Taking you back to the menu."
    else:
        return "I'm having trouble cancelling payment right now. Please try again."
