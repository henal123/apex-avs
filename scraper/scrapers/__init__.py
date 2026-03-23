from .base import BaseScraper, ScrapeResult
from .shopify import ShopifyScraper
from .woocommerce import WooCommerceScraper
from .generic import GenericScraper

__all__ = ["BaseScraper", "ScrapeResult", "ShopifyScraper", "WooCommerceScraper", "GenericScraper"]
