import httpx
from urllib.parse import urljoin
from .base import BaseScraper, ScrapeResult, Collection, Product, BrandingData


class ShopifyScraper(BaseScraper):
    async def detect(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                # Check for /products.json endpoint
                resp = await client.get(f"{self.store_url}/products.json?limit=1")
                if resp.status_code == 200:
                    data = resp.json()
                    return "products" in data
                # Check for Shopify indicators in homepage
                resp = await client.get(self.store_url)
                html = resp.text
                return "Shopify" in html or "shopify" in html.lower() or "cdn.shopify.com" in html
        except Exception:
            return False

    async def scrape(self) -> ScrapeResult:
        errors: list[str] = []
        collections: list[Collection] = []
        branding = BrandingData()
        store_name = ""
        tagline = ""
        description = ""
        metadata: dict = {}

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            # Get store metadata from homepage
            try:
                resp = await client.get(self.store_url)
                html = resp.text
                store_name, tagline, description, branding = self._parse_homepage(html)
            except Exception as e:
                errors.append(f"Homepage parse failed: {str(e)}")

            # Get collections
            try:
                resp = await client.get(f"{self.store_url}/collections.json")
                if resp.status_code == 200:
                    data = resp.json()
                    for coll in data.get("collections", [])[:20]:
                        collection = Collection(
                            name=coll.get("title", ""),
                            slug=coll.get("handle", ""),
                        )
                        # Get products for this collection
                        try:
                            prod_resp = await client.get(
                                f"{self.store_url}/collections/{collection.slug}/products.json?limit={self.max_products}"
                            )
                            if prod_resp.status_code == 200:
                                prod_data = prod_resp.json()
                                for p in prod_data.get("products", []):
                                    images = [
                                        img.get("src", "")
                                        for img in p.get("images", [])
                                        if img.get("src")
                                    ]
                                    variants = [
                                        v.get("title", "")
                                        for v in p.get("variants", [])
                                    ]
                                    collection.products.append(
                                        Product(
                                            name=p.get("title", ""),
                                            slug=p.get("handle", ""),
                                            price=str(p.get("variants", [{}])[0].get("price", "0")),
                                            description=p.get("body_html", "")[:500],
                                            images=images[:5],
                                            variants=variants,
                                        )
                                    )
                        except Exception as e:
                            errors.append(f"Collection {collection.slug} products failed: {str(e)}")

                        collections.append(collection)
            except Exception as e:
                errors.append(f"Collections fetch failed: {str(e)}")

            # If no collections found, try /products.json directly
            if not collections:
                try:
                    resp = await client.get(f"{self.store_url}/products.json?limit={self.max_products}")
                    if resp.status_code == 200:
                        data = resp.json()
                        products = []
                        for p in data.get("products", []):
                            images = [
                                img.get("src", "")
                                for img in p.get("images", [])
                                if img.get("src")
                            ]
                            products.append(
                                Product(
                                    name=p.get("title", ""),
                                    slug=p.get("handle", ""),
                                    price=str(p.get("variants", [{}])[0].get("price", "0")),
                                    description=p.get("body_html", "")[:500],
                                    images=images[:5],
                                    variants=[v.get("title", "") for v in p.get("variants", [])],
                                )
                            )
                        collections.append(
                            Collection(name="All Products", slug="all", products=products)
                        )
                except Exception as e:
                    errors.append(f"Products fallback failed: {str(e)}")

            # Get meta info
            try:
                resp = await client.get(f"{self.store_url}/meta.json")
                if resp.status_code == 200:
                    meta = resp.json()
                    if not store_name:
                        store_name = meta.get("name", "")
                    metadata["shopify_id"] = meta.get("id")
                    metadata["myshopify_domain"] = meta.get("myshopify_domain", "")
            except Exception:
                pass

        status = "complete" if collections else ("partial" if store_name else "failed")

        return ScrapeResult(
            store_name=store_name or self.store_url,
            store_url=self.store_url,
            platform="shopify",
            tagline=tagline,
            description=description,
            collections=collections,
            branding=branding,
            metadata=metadata,
            status=status,
            errors=errors,
        )

    def _parse_homepage(self, html: str) -> tuple[str, str, str, BrandingData]:
        from bs4 import BeautifulSoup
        from extractors.color import extract_colors
        from extractors.typography import extract_fonts
        from extractors.metadata import extract_meta

        soup = BeautifulSoup(html, "lxml")
        meta = extract_meta(soup)
        colors = extract_colors(html)
        fonts = extract_fonts(html)

        logo_url = None
        # Try to find logo
        for img in soup.find_all("img"):
            classes = " ".join(img.get("class", []))
            alt = (img.get("alt") or "").lower()
            src = img.get("src", "")
            if "logo" in classes or "logo" in alt or "logo" in src:
                logo_url = src if src.startswith("http") else None
                break

        favicon_url = None
        link = soup.find("link", rel="icon") or soup.find("link", rel="shortcut icon")
        if link and link.get("href"):
            href = link["href"]
            favicon_url = href if href.startswith("http") else None

        branding = BrandingData(
            logo_url=logo_url,
            favicon_url=favicon_url,
            colors=colors,
            fonts=fonts,
        )

        return meta["store_name"], meta["tagline"], meta["description"], branding
