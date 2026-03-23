import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from dotenv import load_dotenv

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from scrapers.shopify import ShopifyScraper
from scrapers.woocommerce import WooCommerceScraper
from scrapers.generic import GenericScraper
from scrapers.base import ScrapeResult
from utils.storage import download_and_upload_image, get_file_extension


SERVICE_KEY = os.getenv("SERVICE_KEY", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="VisionX Store Scraper", version="1.0.0", lifespan=lifespan)


class ScrapeRequest(BaseModel):
    store_url: str
    brand_id: str
    supabase_url: str | None = None
    supabase_key: str | None = None
    max_products_per_collection: int = 50
    upload_assets: bool = True


class ScrapeResponse(BaseModel):
    data: dict
    assets_uploaded: int
    status: str


@app.get("/health")
async def health():
    return {"status": "ok", "service": "visionx-scraper"}


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_store(
    request: ScrapeRequest,
    x_service_key: str = Header(default="", alias="X-Service-Key"),
):
    # Auth check
    if SERVICE_KEY and x_service_key != SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Invalid service key")

    store_url = request.store_url.rstrip("/")
    if not store_url.startswith("http"):
        store_url = f"https://{store_url}"

    # Detect platform and scrape
    result: ScrapeResult | None = None
    scrapers = [
        ShopifyScraper(store_url, request.max_products_per_collection),
        WooCommerceScraper(store_url, request.max_products_per_collection),
        GenericScraper(store_url, request.max_products_per_collection),
    ]

    for scraper in scrapers:
        try:
            if await scraper.detect():
                result = await scraper.scrape()
                break
        except Exception:
            continue

    if not result:
        raise HTTPException(status_code=500, detail="All scrapers failed")

    # Upload assets to Supabase Storage if configured
    assets_uploaded = 0
    if request.upload_assets and request.supabase_url and request.supabase_key:
        assets_uploaded = await _upload_assets(
            result,
            request.brand_id,
            request.supabase_url,
            request.supabase_key,
        )

    return ScrapeResponse(
        data=result.model_dump(),
        assets_uploaded=assets_uploaded,
        status=result.status,
    )


async def _upload_assets(
    result: ScrapeResult,
    brand_id: str,
    supabase_url: str,
    supabase_key: str,
) -> int:
    """Upload scraped images to Supabase Storage."""
    count = 0

    # Upload logo
    if result.branding.logo_url:
        ext = get_file_extension(result.branding.logo_url)
        path = f"{brand_id}/logo{ext}"
        uploaded = await download_and_upload_image(
            result.branding.logo_url, path, supabase_url, supabase_key
        )
        if uploaded:
            result.branding.logo_url = uploaded
            count += 1

    # Upload product images
    for coll in result.collections:
        for product in coll.products:
            uploaded_images = []
            for i, img_url in enumerate(product.images[:3]):  # Max 3 per product
                ext = get_file_extension(img_url)
                path = f"{brand_id}/products/{coll.slug}/{product.slug}/{i}{ext}"
                uploaded = await download_and_upload_image(
                    img_url, path, supabase_url, supabase_key
                )
                if uploaded:
                    uploaded_images.append(uploaded)
                    count += 1
            product.images = uploaded_images if uploaded_images else product.images

    return count


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
