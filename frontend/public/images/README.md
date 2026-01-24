# Menu Item Images

Place your menu item images in this directory.

## Available Image Files

Currently, only the following images are configured:

### Pizzas
- `margherita-pizza.jpg` - Used for both "Margherita Pizza" and "Cheese Pizza" (they are interchangeable)

### Beverages
- `coke.jpg` - Used for "Coke", "Coca Cola", etc.

## Image Mapping

- **Margherita Pizza** and **Cheese Pizza** both use `margherita-pizza.jpg`
- **Coke** (and variations like "Coca Cola") uses `coke.jpg`

## Image Requirements

- Format: JPG or PNG
- Recommended size: 512x512px or larger (square aspect ratio works best for the plate display)
- The images will be displayed in a circular plate frame, so center your subject

## Adding More Images

To add more menu item images in the future:

1. Add your image file to this directory
2. Update `backend/image_mapping.py` to include the new image path in the `MENU_IMAGE_MAP` dictionary
3. Update the matching logic in `get_image_path()` if needed for fuzzy matching
