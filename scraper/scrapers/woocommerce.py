import httpx
from .base import BaseScraper, ScrapeResult, Collection, Product, BrandingData


class WooCommerceScraper(BaseScraper):
    async def detect(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                # Check for WooCommerce REST API
                resp = await client.get(f"{self.store_url}/wp-json/wc/v3/")
                if resp.status_code in (200, 401):
                    return True
                # Check homepage for WooCommerce indicators
                resp = await client.get(self.store_url)
                html = resp.text
                return "woocommerce" in html.lower() or "wc-" in html
        except Exception:
            return False

    async def scrape(self) -> ScrapeResult:
        errors: list[str] = []
        collections: list[Collection] = []
        branding = BrandingData()
        store_name = ""
        tagline = ""
        description = ""

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            # Parse homepage for metadata and branding
            try:
                resp = await client.get(self.store_url)
                html = resp.text
                store_name, tagline, description, branding = self._parse_homepage(html)
            except Exception as e:
                errors.append(f"Homepage parse failed: {str(e)}")

            # Try WP REST API for products (public endpoints)
            try:
                resp = await client.get(
                    f"{self.store_url}/wp-json/wc/store/v1/products",
                    params={"per_page": self.max_products},
                )
                if resp.status_code == 200:
                    products = []
                    for p in resp.json():
                        images = [img.get("src", "") for img in p.get("images", []) if img.get("src")]
                        products.append(
                            Product(
                                name=p.get("name", ""),
                                slug=p.get("slug", ""),
                                price=p.get("prices", {}).get("price", "0"),
                                description=p.get("short_description", "")[:500],
                                images=images[:5],
                                variants=[],
                            )
                        )
                    collections.append(
                        Collection(name="All Products", slug="all", products=products)
                    )
            except Exception as e:
                errors.append(f"WC Store API failed: {str(e)}")

            # Try categories
            if not collections:
                try:
                    resp = await client.get(
                        f"{self.store_url}/wp-json/wc/store/v1/products/categories"
                    )
                    if resp.status_code == 200:
                        for cat in resp.json()[:20]:
                            collections.append(
                                Collection(
                                    name=cat.get("name", ""),
                                    slug=cat.get("slug", ""),
                                )
                            )
                except Exception as e:
                    errors.append(f"WC categories failed: {str(e)}")

        # Fallback to generic HTML scraping if REST API doesn't work
        if not collections:
            from .generic import GenericScraper
            generic = GenericScraper(self.store_url, self.max_products)
            result = await generic.scrape()
            result.platform = "woocommerce"
            return result

        status = "complete" if collections else "partial"
        return ScrapeResult(
            store_name=store_name or self.store_url,
            store_url=self.store_url,
            platform="woocommerce",
            tagline=tagline,
            description=description,
            collections=collections,
            branding=branding,
            metadata={},
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
        for img in soup.select(".custom-logo, .site-logo img, [class*='logo'] img"):
            src = img.get("src", "")
            if src.startswith("http"):
                logo_url = src
                break

        branding = BrandingData(
            logo_url=logo_url,
            colors=colors,
            fonts=fonts,
        )
        return meta["store_name"], meta["tagline"], meta["description"], branding
