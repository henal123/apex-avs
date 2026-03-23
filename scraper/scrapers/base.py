from abc import ABC, abstractmethod
from typing import Any
from pydantic import BaseModel


class Product(BaseModel):
    name: str
    slug: str
    price: str
    description: str = ""
    images: list[str] = []
    variants: list[str] = []


class Collection(BaseModel):
    name: str
    slug: str
    products: list[Product] = []


class BrandingData(BaseModel):
    logo_url: str | None = None
    favicon_url: str | None = None
    colors: list[str] = []
    fonts: list[str] = []


class ScrapeResult(BaseModel):
    store_name: str
    store_url: str
    platform: str
    tagline: str = ""
    description: str = ""
    collections: list[Collection] = []
    branding: BrandingData = BrandingData()
    metadata: dict[str, Any] = {}
    status: str = "complete"  # complete | partial | failed
    errors: list[str] = []


class BaseScraper(ABC):
    def __init__(self, store_url: str, max_products_per_collection: int = 50):
        self.store_url = store_url.rstrip("/")
        self.max_products = max_products_per_collection

    @abstractmethod
    async def scrape(self) -> ScrapeResult:
        pass

    @abstractmethod
    async def detect(self) -> bool:
        """Return True if this scraper can handle the given URL."""
        pass
