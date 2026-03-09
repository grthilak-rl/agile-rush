from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://agilerush:agilerush_secret@db:5432/agilerush"
    JWT_SECRET_KEY: str = "super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    # App
    ENVIRONMENT: str = "development"
    APP_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Storage
    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = "./uploads"
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "ap-south-1"

    # Email
    EMAIL_PROVIDER: str = "console"
    FROM_EMAIL: str = "noreply@agilerush.com"
    AWS_SES_REGION: str = "ap-south-1"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
