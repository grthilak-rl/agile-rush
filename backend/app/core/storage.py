"""
File storage service. Uses local filesystem for development.
For production, swap the methods to use S3 / cloud storage while keeping the same interface.
"""

import os
import uuid

from fastapi import UploadFile


class StorageService:
    def __init__(self):
        self.upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
        os.makedirs(self.upload_dir, exist_ok=True)

    async def upload(self, file: UploadFile, project_id: str, item_id: str) -> dict:
        """Save file and return {file_key, file_size, mime_type, thumbnail_url}."""
        ext = os.path.splitext(file.filename or "")[1]
        file_key = f"{project_id}/{item_id}/{uuid.uuid4()}{ext}"
        full_path = os.path.join(self.upload_dir, file_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        contents = await file.read()
        with open(full_path, "wb") as f:
            f.write(contents)

        thumbnail_url = None
        if file.content_type and file.content_type.startswith("image/") and file.content_type != "image/svg+xml":
            thumbnail_url = await self._create_thumbnail(full_path, file_key)

        return {
            "file_key": file_key,
            "file_size": len(contents),
            "mime_type": file.content_type or "application/octet-stream",
            "thumbnail_url": thumbnail_url,
        }

    async def _create_thumbnail(self, path: str, file_key: str) -> str:
        """Generate a 200x200 max thumbnail for image files."""
        try:
            from PIL import Image
            thumb_key = f"thumbs/{file_key}"
            thumb_path = os.path.join(self.upload_dir, thumb_key)
            os.makedirs(os.path.dirname(thumb_path), exist_ok=True)
            img = Image.open(path)
            img.thumbnail((200, 200))
            img.save(thumb_path)
            return thumb_key
        except Exception:
            return None

    def get_url(self, file_key: str) -> str:
        """Resolve a file_key to a URL path."""
        return f"/uploads/{file_key}"

    async def delete(self, file_key: str):
        """Delete a file and its thumbnail if it exists."""
        path = os.path.join(self.upload_dir, file_key)
        if os.path.exists(path):
            os.remove(path)
        # Also try to delete thumbnail
        thumb_path = os.path.join(self.upload_dir, f"thumbs/{file_key}")
        if os.path.exists(thumb_path):
            os.remove(thumb_path)


storage_service = StorageService()
