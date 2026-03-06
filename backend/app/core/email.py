"""
Email service for AgileRush.
Supports two modes:
- console (default): Logs emails to stdout for development
- smtp: Sends real emails via SMTP for production
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class EmailService:
    def __init__(self):
        self.provider = os.getenv("EMAIL_PROVIDER", "console")  # console | smtp
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@agilerush.com")

    async def send(self, to: str, subject: str, html_body: str):
        if self.provider == "console":
            print(f"\n--- EMAIL ---")
            print(f"  TO: {to}")
            print(f"  SUBJECT: {subject}")
            print(f"  BODY: {html_body[:200]}...")
            print(f"--- END EMAIL ---\n")
            return True

        if self.provider == "smtp":
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = self.from_email
                msg["To"] = to
                msg.attach(MIMEText(html_body, "html"))

                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
                return True
            except Exception as e:
                print(f"Failed to send email to {to}: {e}")
                return False

        return False


email_service = EmailService()
