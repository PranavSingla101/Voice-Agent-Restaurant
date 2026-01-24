"""
Helper functions for order management operations.
"""

from typing import Optional
from .message_sender import send_data_message


async def handle_proceed_to_payment(agent_instance) -> str:
    """Handle proceeding to the payment page."""
    # Validate cart is not empty
    if not agent_instance._cart_items:
        return "You haven't ordered anything yet. What can I get started for you?"
    
    room = agent_instance.session.room
    if not room:
        return "I'm having trouble processing your order right now. Please try again."
    
    # Calculate totals for confirmation message
    subtotal = sum(
        item.get("price", 0.0) * item.get("quantity", 1) 
        for item in agent_instance._cart_items
    )
    gst = subtotal * 0.05
    total = subtotal + gst
    
    # Send data message to frontend
    success = await send_data_message(
        room=room,
        message_type="navigate_to_payment",
        data={},
    )
    
    if success:
        return f"Perfect! Your order total is ₹{total:.0f} (including GST). I'm taking you to the payment page now."
    else:
        return "I'm having trouble processing your order right now. Please try again."


async def handle_cancel_order(agent_instance, order_id: Optional[str] = None) -> str:
    """Handle cancelling a confirmed order."""
    room = agent_instance.session.room
    if not room:
        return "I'm having trouble processing your request right now. Please try again."
    
    # Note: In a real implementation, we would check the order timestamp
    # and validate it's within 5 minutes. For now, we'll allow cancellation
    # and let the frontend handle the time validation based on localStorage.
    
    success = await send_data_message(
        room=room,
        message_type="cancel_order",
        data={"orderId": order_id} if order_id else {},
    )
    
    if success:
        return "I've cancelled your order. If you'd like to place a new order, just let me know!"
    else:
        return "I'm having trouble cancelling your order. Please contact the restaurant directly."


def handle_modify_order(agent_instance) -> str:
    """Handle modifying a confirmed order."""
    # Note: In a real implementation, we would check the order timestamp
    # For now, we'll allow modifications and let the frontend handle validation
    
    return "I can help you modify your order if it's within 5 minutes of placement. What would you like to change? If it's been longer, please contact the restaurant directly as preparation may have started."
