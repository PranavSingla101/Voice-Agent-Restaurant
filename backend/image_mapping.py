"""
Image mapping for menu items.

Maps menu item names to their corresponding image file paths.
Supports fuzzy matching for variations in item names.
"""

from typing import Optional
import re


# Mapping of menu item names (normalized) to image paths
# Images should be stored in frontend/public/images/
# Only includes images that are actually available:
# - margherita-pizza.jpg (also used for "cheese pizza" and "cheese")
# - coke.jpg
# - cheese-pizza.jpg (if different from margherita, otherwise use margherita)
MENU_IMAGE_MAP = {
    # Pizzas - Margherita and Cheese are interchangeable
    "margherita": "/images/margherita-pizza.jpg",
    "margherita pizza": "/images/margherita-pizza.jpg",
    "cheese": "/images/margherita-pizza.jpg",
    "cheese pizza": "/images/margherita-pizza.jpg",
    
    # Beverages
    "coke": "/images/coke.jpg",
    "coca cola": "/images/coke.jpg",
    "coca-cola": "/images/coke.jpg",
}


def normalize_item_name(item_name: str) -> str:
    """
    Normalize menu item name for matching.
    
    Converts to lowercase, removes extra spaces, and handles common variations.
    
    Args:
        item_name: The menu item name to normalize
        
    Returns:
        Normalized item name
    """
    # Convert to lowercase and strip whitespace
    normalized = item_name.lower().strip()
    
    # Remove extra spaces
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # Remove common prefixes/suffixes
    normalized = normalized.replace("the ", "").replace("a ", "").replace("an ", "")
    
    return normalized


def get_image_path(item_name: str) -> Optional[str]:
    """
    Get image path for a menu item.
    
    Performs fuzzy matching to find the best match for the item name.
    
    Args:
        item_name: The menu item name (can be partial or have variations)
        
    Returns:
        Image path if found, None otherwise
    """
    if not item_name:
        return None
    
    normalized = normalize_item_name(item_name)
    
    # Direct match
    if normalized in MENU_IMAGE_MAP:
        return MENU_IMAGE_MAP[normalized]
    
    # Special handling: "cheese" and "margherita" are interchangeable
    if "cheese" in normalized and "pizza" in normalized:
        return "/images/margherita-pizza.jpg"
    if normalized == "cheese":
        return "/images/margherita-pizza.jpg"
    if "margherita" in normalized:
        return "/images/margherita-pizza.jpg"
    
    # Check for "coke" variations
    if "coke" in normalized or "coca" in normalized or "cola" in normalized:
        return "/images/coke.jpg"
    
    # Partial match - check if any key contains the normalized name or vice versa
    for key, path in MENU_IMAGE_MAP.items():
        if normalized in key or key in normalized:
            return path
    
    # Word-based matching - check if significant words match
    normalized_words = set(normalized.split())
    for key, path in MENU_IMAGE_MAP.items():
        key_words = set(key.split())
        # If at least 2 words match or one significant word matches
        common_words = normalized_words.intersection(key_words)
        if len(common_words) >= 2 or (len(common_words) == 1 and len(normalized_words) <= 2):
            return path
    
    return None
