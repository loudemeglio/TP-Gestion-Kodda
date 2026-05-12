import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    """Envía un correo por SMTP. Si MAIL_SUPPRESS=true, solo registra en log (útil en desarrollo)."""
    settings = get_settings()
    if settings.mail_suppress:
        logger.info("[MAIL_SUPPRESS] to=%s subject=%s\n%s", to, subject, body)
        return

    if not settings.smtp_host or not settings.smtp_from:
        logger.warning("SMTP no configurado (SMTP_HOST / SMTP_FROM); no se envía correo a %s", to)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)
