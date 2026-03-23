from bs4 import BeautifulSoup


def extract_meta(soup: BeautifulSoup) -> dict[str, str]:
    """Extract store metadata from parsed HTML."""
    store_name = ""
    tagline = ""
    description = ""

    # Title tag
    title_tag = soup.find("title")
    if title_tag:
        title_text = title_tag.get_text(strip=True)
        # Often format: "Store Name - Tagline" or "Store Name | Tagline"
        for sep in [" | ", " - ", " – ", " — "]:
            if sep in title_text:
                parts = title_text.split(sep, 1)
                store_name = parts[0].strip()
                tagline = parts[1].strip()
                break
        if not store_name:
            store_name = title_text

    # OG tags
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        if not store_name:
            store_name = og_title["content"]

    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        description = og_desc["content"]

    # Meta description
    if not description:
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            description = meta_desc["content"]

    # OG site name
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content"):
        store_name = og_site["content"]

    # Schema.org
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            import json
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                if data.get("@type") in ("WebSite", "Organization", "Store"):
                    if not store_name and data.get("name"):
                        store_name = data["name"]
                    if not description and data.get("description"):
                        description = data["description"]
                    if not tagline and data.get("slogan"):
                        tagline = data["slogan"]
        except Exception:
            pass

    return {
        "store_name": store_name,
        "tagline": tagline,
        "description": description[:500] if description else "",
    }
