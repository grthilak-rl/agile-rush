"""
File storage service.
Supports two backends:
- local (default): Filesystem storage for development
- s3: AWS S3 storage for production (uses IAM role credentials)
"""

import os
import uuid

from fastapi import UploadFile


class StorageService:
    def __init__(self):
        self.backend = os.getenv("STORAGE_BACKEND", "local")
        if self.backend == "s3":
            import boto3
            from botocore.config import Config

            self.s3 = boto3.client(
                "s3",
                region_name=os.getenv("AWS_REGION", "us-east-1"),
                config=Config(signature_version="s3v4"),
            )
            self.bucket = os.getenv("AWS_S3_BUCKET")
        else:
            self.upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
            os.makedirs(self.upload_dir, exist_ok=True)

    async def upload(self, file: UploadFile, project_id: str, item_id: str) -> dict:
        """Save file and return {file_key, file_size, mime_type, thumbnail_url}."""
        ext = os.path.splitext(file.filename or "")[1]
        file_key = f"{project_id}/{item_id}/{uuid.uuid4()}{ext}"

        contents = await file.read()
        content_type = file.content_type or "application/octet-stream"

        if self.backend == "s3":
            self.s3.put_object(
                Bucket=self.bucket,
                Key=file_key,
                Body=contents,
                ContentType=content_type,
            )
            thumbnail_url = None
            if content_type.startswith("image/") and content_type != "image/svg+xml":
                thumbnail_url = await self._create_s3_thumbnail(contents, file_key, content_type)
        else:
            full_path = os.path.join(self.upload_dir, file_key)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "wb") as f:
                f.write(contents)

            thumbnail_url = None
            if content_type.startswith("image/") and content_type != "image/svg+xml":
                thumbnail_url = await self._create_thumbnail(full_path, file_key)

        return {
            "file_key": file_key,
            "file_size": len(contents),
            "mime_type": content_type,
            "thumbnail_url": thumbnail_url,
        }

    async def _create_thumbnail(self, path: str, file_key: str) -> str:
        """Generate a 200x200 max thumbnail for image files (local storage)."""
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

    async def _create_s3_thumbnail(self, contents: bytes, file_key: str, content_type: str) -> str:
        """Generate and upload a thumbnail to S3."""
        try:
            from PIL import Image
            import io

            thumb_key = f"thumbs/{file_key}"
            img = Image.open(io.BytesIO(contents))
            img.thumbnail((200, 200))
            buf = io.BytesIO()
            fmt = "PNG" if content_type == "image/png" else "JPEG"
            img.save(buf, format=fmt)
            buf.seek(0)
            self.s3.put_object(
                Bucket=self.bucket,
                Key=thumb_key,
                Body=buf.getvalue(),
                ContentType=content_type,
            )
            return thumb_key
        except Exception:
            return None

    def get_url(self, file_key: str) -> str:
        """Resolve a file_key to a URL."""
        if self.backend == "s3":
            return self.s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": file_key},
                ExpiresIn=3600,
            )
        return f"/uploads/{file_key}"

    async def delete(self, file_key: str):
        """Delete a file and its thumbnail."""
        if self.backend == "s3":
            self.s3.delete_object(Bucket=self.bucket, Key=file_key)
            self.s3.delete_object(Bucket=self.bucket, Key=f"thumbs/{file_key}")
        else:
            path = os.path.join(self.upload_dir, file_key)
            if os.path.exists(path):
                os.remove(path)
            thumb_path = os.path.join(self.upload_dir, f"thumbs/{file_key}")
            if os.path.exists(thumb_path):
                os.remove(thumb_path)


storage_service = StorageService()
