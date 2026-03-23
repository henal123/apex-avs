import httpx
import os
from urllib.parse import urlparse


async def download_and_upload_image(
    image_url: str,
    storage_path: str,
    supabase_url: str,
    supabase_key: str,
    bucket: str = "brand-assets",
) -> str | None:
    """Download an image from URL and upload to Supabase Storage.
    Returns the storage path on success, None on failure."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(image_url)
            if resp.status_code != 200:
                return None

            content_type = resp.headers.get("content-type", "image/jpeg")
            image_data = resp.content

            if len(image_data) < 100:  # Skip tiny/empty responses
                return None

            # Upload to Supabase Storage
            upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"
            upload_resp = await client.post(
                upload_url,
                content=image_data,
                headers={
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": content_type,
                    "x-upsert": "true",
                },
            )

            if upload_resp.status_code in (200, 201):
                return storage_path
            return None
    except Exception:
        return None


def get_file_extension(url: str) -> str:
    """Get file extension from URL, defaulting to .jpg."""
    path = urlparse(url).path
    ext = os.path.splitext(path)[1].lower()
    if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"):
        return ext
    return ".jpg"
