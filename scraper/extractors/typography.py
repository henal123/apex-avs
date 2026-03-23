import re


def extract_fonts(html: str) -> list[str]:
    """Extract font family names from HTML/CSS content."""
    fonts: set[str] = set()

    # CSS font-family declarations
    ff_pattern = r'font-family:\s*([^;}\n]+)'
    for match in re.findall(ff_pattern, html, re.IGNORECASE):
        for font in _parse_font_family(match):
            fonts.add(font)

    # Google Fonts link
    gf_pattern = r'fonts\.googleapis\.com/css[^"\']*family=([^"\'&]+)'
    for match in re.findall(gf_pattern, html):
        for font in match.split("|"):
            name = font.split(":")[0].replace("+", " ").strip()
            if name and name not in _GENERIC_FONTS:
                fonts.add(name)

    # @font-face declarations
    face_pattern = r"@font-face\s*\{[^}]*font-family:\s*['\"]?([^'\";\n}]+)"
    for match in re.findall(face_pattern, html, re.IGNORECASE):
        name = match.strip().strip("'\"")
        if name and name not in _GENERIC_FONTS:
            fonts.add(name)

    # CSS custom properties for fonts
    var_pattern = r'--[\w-]*font[\w-]*:\s*["\']?([^;}\n"\']+)'
    for match in re.findall(var_pattern, html, re.IGNORECASE):
        for font in _parse_font_family(match):
            fonts.add(font)

    return sorted(list(fonts))[:10]


_GENERIC_FONTS = {
    "serif", "sans-serif", "monospace", "cursive", "fantasy",
    "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace",
    "inherit", "initial", "unset",
}


def _parse_font_family(value: str) -> list[str]:
    """Parse a CSS font-family value into individual font names."""
    fonts = []
    for part in value.split(","):
        name = part.strip().strip("'\"").strip()
        if name and name.lower() not in _GENERIC_FONTS:
            fonts.append(name)
    return fonts
