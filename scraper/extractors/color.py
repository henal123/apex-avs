import re


def extract_colors(html: str) -> list[str]:
    """Extract unique CSS color values from HTML/CSS content."""
    colors: set[str] = set()

    # Hex colors (#fff, #ffffff)
    hex_pattern = r'#(?:[0-9a-fA-F]{3}){1,2}\b'
    for match in re.findall(hex_pattern, html):
        normalized = _normalize_hex(match)
        if normalized and not _is_boring_color(normalized):
            colors.add(normalized)

    # RGB/RGBA colors
    rgb_pattern = r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})'
    for r, g, b in re.findall(rgb_pattern, html):
        hex_color = f"#{int(r):02x}{int(g):02x}{int(b):02x}"
        if not _is_boring_color(hex_color):
            colors.add(hex_color)

    # CSS custom properties that look like colors
    var_pattern = r'--[\w-]*color[\w-]*:\s*(#[0-9a-fA-F]{3,8})'
    for match in re.findall(var_pattern, html, re.IGNORECASE):
        normalized = _normalize_hex(match)
        if normalized:
            colors.add(normalized)

    return sorted(list(colors))[:20]


def _normalize_hex(color: str) -> str | None:
    """Normalize hex color to 6-digit lowercase format."""
    color = color.strip().lower()
    if not color.startswith("#"):
        return None
    hex_part = color[1:]
    if len(hex_part) == 3:
        hex_part = "".join(c * 2 for c in hex_part)
    if len(hex_part) != 6:
        return None
    return f"#{hex_part}"


def _is_boring_color(hex_color: str) -> bool:
    """Filter out pure black, white, and near-grayscale colors."""
    boring = {"#000000", "#ffffff", "#fff", "#000"}
    if hex_color in boring:
        return True
    # Check if it's a gray (r == g == b)
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    if r == g == b:
        return True
    return False
