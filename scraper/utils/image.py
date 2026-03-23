from io import BytesIO
from PIL import Image


def create_thumbnail(image_data: bytes, max_width: int = 400) -> bytes:
    """Create a thumbnail from image data, maintaining aspect ratio."""
    try:
        img = Image.open(BytesIO(image_data))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        w, h = img.size
        if w > max_width:
            ratio = max_width / w
            new_size = (max_width, int(h * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        output = BytesIO()
        img.save(output, format="JPEG", quality=80)
        return output.getvalue()
    except Exception:
        return image_data
