import httpx
from bs4 import BeautifulSoup
from .base import BaseScraper, ScrapeResult, Collection, Product, BrandingData


class GenericScraper(BaseScraper):
    async def detect(self) -> bool:
        return True  # Generic is always the fallback

    async def scrape(self) -> ScrapeResult:
        errors: list[str] = []
        collections: list[Collection] = []
        branding = BrandingData()
        store_name = ""
        tagline = ""
        description = ""

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            try:
                resp = await client.get(self.store_url)
                html = resp.text
                soup = BeautifulSoup(html, "lxml")

                # Extract metadata
                from extractors.metadata import extract_meta
                from extractors.color import extract_colors
                from extractors.typography import extract_fonts

                meta = extract_meta(soup)
                store_name = meta["store_name"]
                tagline = meta["tagline"]
                description = meta["description"]

                colors = extract_colors(html)
                fonts = extract_fonts(html)

                # Find logo
                logo_url = None
                for img in soup.find_all("img"):
                    src = img.get("src", "")
                    alt = (img.get("alt") or "").lower()
                    classes = " ".join(img.get("class", []))
                    if "logo" in alt or "logo" in classes or "logo" in src.lower():
                        logo_url = self._resolve_url(src)
                        break

                # Find favicon
                favicon_url = None
                link = soup.find("link", rel="icon") or soup.find("link", rel="shortcut icon")
                if link and link.get("href"):
                    favicon_url = self._resolve_url(link["href"])

                branding = BrandingData(
                    logo_url=logo_url,
                    favicon_url=favicon_url,
                    colors=colors,
                    fonts=fonts,
                )

                # Try to find product-like elements
                products = self._extract_products(soup)
                if products:
                    collections.append(
                        Collection(name="Products", slug="products", products=products)
                    )

                # Try to find product images from various patterns
                if not products:
                    product_images = self._extract_product_images(soup)
                    if product_images:
                        fake_products = [
                            Product(
                                name=f"Product {i+1}",
                                slug=f"product-{i+1}",
                                price="",
                                images=[img],
                            )
                            for i, img in enumerate(product_images[:20])
                        ]
                        collections.append(
                            Collection(name="Products", slug="products", products=fake_products)
                        )

            except Exception as e:
                errors.append(f"Generic scrape failed: {str(e)}")

        status = "complete" if collections else ("partial" if store_name else "failed")

        return ScrapeResult(
            store_name=store_name or self.store_url,
            store_url=self.store_url,
            platform="generic",
            tagline=tagline,
            description=description,
            collections=collections,
            branding=branding,
            metadata={},
            status=status,
            errors=errors,
        )

    def _resolve_url(self, url: str) -> str | None:
        if not url:
            return None
        if url.startswith("http"):
            return url
        if url.startswith("//"):
            return f"https:{url}"
        if url.startswith("/"):
            return f"{self.store_url}{url}"
        return None

    def _extract_products(self, soup: BeautifulSoup) -> list[Product]:
        products = []
        # Look for common product card patterns
        selectors = [
            "[data-product]",
            ".product-card",
            ".product-item",
            ".product",
            "[itemtype*='Product']",
        ]
        for selector in selectors:
            elements = soup.select(selector)
            if len(elements) >= 2:
                for el in elements[: self.max_products]:
                    name_el = el.select_one("h2, h3, h4, .product-title, .product-name, [itemprop='name']")
                    price_el = el.select_one(".price, [itemprop='price'], .product-price")
                    img_el = el.select_one("img")

                    name = name_el.get_text(strip=True) if name_el else ""
                    price = price_el.get_text(strip=True) if price_el else ""
                    image = self._resolve_url(img_el.get("src", "")) if img_el else None

                    if name:
                        products.append(
                            Product(
                                name=name,
                                slug=name.lower().replace(" ", "-")[:50],
                                price=price,
                                images=[image] if image else [],
                            )
                        )
                if products:
                    break
        return products

    def _extract_product_images(self, soup: BeautifulSoup) -> list[str]:
        images = []
        for img in soup.find_all("img"):
            src = self._resolve_url(img.get("src", ""))
            if not src:
                continue
            # Filter out tiny images, icons, tracking pixels
            width = img.get("width", "")
            height = img.get("height", "")
            if width and int(str(width).replace("px", "") or "0") < 100:
                continue
            if height and int(str(height).replace("px", "") or "0") < 100:
                continue
            # Skip common non-product patterns
            skip = ["icon", "badge", "logo", "payment", "social", "arrow", "pixel"]
            if any(s in src.lower() for s in skip):
                continue
            images.append(src)
        return images[:30]
