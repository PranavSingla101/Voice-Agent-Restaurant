"""
Helper functions for cart management operations.
"""

from typing import List, Optional
from .message_sender import send_data_message


async def handle_add_item_to_cart(
    agent_instance,
    item_name: str,
    quantity: int = 1,
    size: Optional[str] = None,
    price: Optional[float] = None,
    addons: Optional[List[str]] = None,
) -> str:
    """Handle adding an item to the cart."""
    if not item_name:
        return "I need to know which item you'd like to add. Could you tell me the item name?"
    
    if quantity <= 0:
        return "I can't add zero or negative items. Please tell me how many you'd like."
    
    room = agent_instance.session.room
    if not room:
        return "I'm having trouble processing your order right now. Please try again."
    
    # Prepare cart item data
    cart_item = {
        "name": item_name,
        "quantity": quantity,
        "price": price or 0.0,
        "size": size,
        "addons": addons or [],
    }
    
    # Update in-memory cart state for validation
    agent_instance._cart_items.append(cart_item.copy())
    
    # Send data message to frontend
    success = await send_data_message(
        room=room,
        message_type="add_to_cart",
        data={"item": cart_item},
    )
    
    if success:
        # Build confirmation message
        size_text = f" ({size})" if size else ""
        addons_text = f" with {', '.join(addons)}" if addons else ""
        quantity_text = f"{quantity}x " if quantity > 1 else ""
        
        return f"Added {quantity_text}{item_name}{size_text}{addons_text} to your cart."
    else:
        # Remove from in-memory state if send failed
        if agent_instance._cart_items and agent_instance._cart_items[-1]["name"] == item_name:
            agent_instance._cart_items.pop()
        return "I'm having trouble adding that to your cart. Please try again."


async def handle_remove_item_from_cart(agent_instance, item_name: str) -> str:
    """Handle removing an item from the cart."""
    if not item_name:
        return "I need to know which item you'd like to remove. Could you tell me the item name?"
    
    room = agent_instance.session.room
    if not room:
        return "I'm having trouble processing your order right now. Please try again."
    
    # Remove from in-memory cart state
    agent_instance._cart_items = [
        item for item in agent_instance._cart_items 
        if item["name"] != item_name
    ]
    
    # Send data message to frontend
    success = await send_data_message(
        room=room,
        message_type="remove_from_cart",
        data={"itemName": item_name},
    )
    
    if success:
        return f"Removed {item_name} from your cart."
    else:
        return "I'm having trouble removing that item. Please try again."


async def handle_update_cart_quantity(
    agent_instance, item_name: str, new_quantity: int
) -> str:
    """Handle updating the quantity of an item in the cart."""
    if not item_name:
        return "I need to know which item you'd like to update. Could you tell me the item name?"
    
    if new_quantity <= 0:
        return "Quantity must be at least 1. If you want to remove the item, I can do that instead."
    
    room = agent_instance.session.room
    if not room:
        return "I'm having trouble processing your order right now. Please try again."
    
    # Update in-memory cart state
    updated = False
    for item in agent_instance._cart_items:
        if item["name"] == item_name:
            item["quantity"] = new_quantity
            updated = True
            break
    
    if not updated:
        return f"I couldn't find {item_name} in your cart. Would you like to add it?"
    
    # Prepare updated cart items for frontend
    updated_items = [
        {
            "name": item["name"],
            "quantity": item["quantity"],
            "price": item.get("price", 0.0),
            "size": item.get("size"),
            "addons": item.get("addons", []),
        }
        for item in agent_instance._cart_items
    ]
    
    # Send data message to frontend
    success = await send_data_message(
        room=room,
        message_type="update_cart",
        data={"items": updated_items},
    )
    
    if success:
        return f"Updated {item_name} quantity to {new_quantity}."
    else:
        return "I'm having trouble updating the quantity. Please try again."


async def handle_clear_cart(agent_instance) -> str:
    """Handle clearing all items from the cart."""
    room = agent_instance.session.room
    if not room:
        return "I'm having trouble processing your order right now. Please try again."
    
    # Clear in-memory cart state
    agent_instance._cart_items = []
    
    # Send data message to frontend
    success = await send_data_message(
        room=room,
        message_type="clear_cart",
        data={},
    )
    
    if success:
        return "I've cleared your cart. What would you like to order?"
    else:
        return "I'm having trouble clearing your cart. Please try again."


def handle_get_cart_summary(agent_instance) -> str:
    """Handle getting a summary of the cart contents."""
    if not agent_instance._cart_items:
        return "Your cart is empty. What would you like to order?"
    
    # Calculate totals
    subtotal = sum(
        item.get("price", 0.0) * item.get("quantity", 1) 
        for item in agent_instance._cart_items
    )
    gst = subtotal * 0.05  # 5% GST
    total = subtotal + gst
    
    # Build summary text
    summary_lines = ["Here's what's in your cart:"]
    for item in agent_instance._cart_items:
        name = item["name"]
        quantity = item.get("quantity", 1)
        price = item.get("price", 0.0)
        size = item.get("size")
        addons = item.get("addons", [])
        
        size_text = f" ({size})" if size else ""
        addons_text = f" with {', '.join(addons)}" if addons else ""
        item_total = price * quantity
        
        summary_lines.append(
            f"- {quantity}x {name}{size_text}{addons_text}: ₹{item_total:.0f}"
        )
    
    summary_lines.append(f"\nSubtotal: ₹{subtotal:.0f}")
    summary_lines.append(f"GST (5%): ₹{gst:.0f}")
    summary_lines.append(f"Total: ₹{total:.0f}")
    
    return "\n".join(summary_lines)
