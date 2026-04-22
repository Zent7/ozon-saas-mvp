from __future__ import annotations

from email.message import EmailMessage
import smtplib

from app.core.config import settings


def send_deletion_notification(subject: str, body: str) -> bool:
    if not (settings.deletion_notify_email and settings.smtp_host and settings.smtp_from):
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = settings.deletion_notify_email
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)
    return True
