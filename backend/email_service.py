"""
Email service for sending transactional emails
Handles password reset and other system notifications
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from config import Settings

settings = Settings()

class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        # Remove quotes if present (common mistake when copying)
        self.smtp_username = str(settings.SMTP_USERNAME).strip("'\"") if settings.SMTP_USERNAME else None
        self.smtp_password = str(settings.SMTP_PASSWORD).strip("'\"") if settings.SMTP_PASSWORD else None
        self.email_from = settings.EMAIL_FROM
        
    def is_configured(self) -> bool:
        """Check if email service is configured"""
        configured = bool(self.smtp_host and self.smtp_username and self.smtp_password)
        if not configured:
            print(f"⚠️ Email service not fully configured:")
            print(f"   SMTP_HOST: {self.smtp_host}")
            print(f"   SMTP_USERNAME: {self.smtp_username}")
            print(f"   SMTP_PASSWORD: {'***' if self.smtp_password else 'None'}")
        return configured
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> dict:
        """
        Send email with HTML and/or text content
        
        Returns:
            dict: {"success": bool, "message": str, "error": Optional[str]}
        """
        if not self.is_configured():
            # In development, log email instead of sending
            print(f"📧 [DEV MODE] Email would be sent to: {to_email}")
            print(f"📧 Subject: {subject}")
            print(f"📧 Body:\n{text_body or html_body}")
            return {
                "success": True,
                "message": "Email service not configured. Email logged in development mode."
            }
        
        try:
            print(f"📧 Attempting to send email...")
            print(f"📧 SMTP Host: {self.smtp_host}")
            print(f"📧 SMTP Port: {self.smtp_port}")
            print(f"📧 SMTP Username: {self.smtp_username}")
            print(f"📧 From: {self.email_from}")
            print(f"📧 To: {to_email}")
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.email_from
            msg['To'] = to_email
            
            # Add text and HTML parts
            if text_body:
                part1 = MIMEText(text_body, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(html_body, 'html')
            msg.attach(part2)
            
            # Send email
            print(f"📧 Connecting to SMTP server...")
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                print(f"📧 Starting TLS...")
                server.starttls()
                print(f"📧 Logging in...")
                server.login(self.smtp_username, self.smtp_password)
                print(f"📧 Sending message...")
                server.send_message(msg)
                print(f"✅ Email sent successfully!")
            
            return {
                "success": True,
                "message": f"Email sent successfully to {to_email}"
            }
        except smtplib.SMTPAuthenticationError as e:
            error_msg = str(e)
            print(f"❌ SMTP Authentication Error: {error_msg}")
            print(f"❌ Common causes:")
            print(f"   - Incorrect username/password")
            print(f"   - Gmail requires 'App Password' instead of regular password")
            print(f"   - 2FA must be enabled and App Password generated")
            return {
                "success": False,
                "error": f"Authentication failed: {error_msg}. For Gmail, use App Password.",
                "message": "Failed to send email"
            }
        except smtplib.SMTPException as e:
            error_msg = str(e)
            print(f"❌ SMTP Error: {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "message": "Failed to send email"
            }
        except Exception as e:
            error_msg = str(e)
            print(f"❌ General Error sending email: {error_msg}")
            print(f"❌ Error type: {type(e).__name__}")
            import traceback
            print(f"❌ Traceback:\n{traceback.format_exc()}")
            return {
                "success": False,
                "error": error_msg,
                "message": "Failed to send email"
            }
    
    def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_link: str
    ) -> dict:
        """
        Send password reset email with reset link
        
        Args:
            to_email: Recipient email address
            user_name: User's full name
            reset_link: URL with reset token
        """
        subject = "Recuperación de Contraseña - CORTEX"
        
        # HTML body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1976d2; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
                .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                .warning {{ color: #d32f2f; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>CORTEX</h1>
                    <p>Sistema de Historias Clínicas</p>
                </div>
                <div class="content">
                    <h2>Recuperación de Contraseña</h2>
                    <p>Hola {user_name},</p>
                    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                    <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Restablecer Contraseña</a>
                    </p>
                    <p>O copia y pega el siguiente enlace en tu navegador:</p>
                    <p style="word-break: break-all; color: #1976d2;">{reset_link}</p>
                    <p class="warning">⏱️ Este enlace expirará en 1 hora por seguridad.</p>
                    <p>Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.</p>
                </div>
                <div class="footer">
                    <p>Este es un correo automático, por favor no respondas.</p>
                    <p>&copy; 2024 CORTEX - Sistema de Gestión de Historias Clínicas</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Text body (fallback)
        text_body = f"""
        CORTEX - Sistema de Historias Clínicas
        
        Recuperación de Contraseña
        
        Hola {user_name},
        
        Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        
        Haz clic en el siguiente enlace para crear una nueva contraseña:
        {reset_link}
        
        Este enlace expirará en 1 hora por seguridad.
        
        Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
        
        --
        Este es un correo automático, por favor no respondas.
        © 2024 CORTEX - Sistema de Gestión de Historias Clínicas
        """
        
        return self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )

# Singleton instance
_email_service: Optional[EmailService] = None

def get_email_service() -> EmailService:
    """Get singleton email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service

