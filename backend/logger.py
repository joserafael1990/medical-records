"""
Structured logging configuration for CORTEX Medical System
Provides consistent, structured logging across the application
"""
import logging
import sys
from typing import Any, Dict
import structlog
from structlog.typing import Processor
try:
    from config import settings
except ImportError:
    # Fallback if config is not available
    class Settings:
        LOG_LEVEL = "INFO"
        APP_VERSION = "1.0.0"
        APP_ENV = "development"
        is_development = True
    settings = Settings()


class RequestContextProcessor:
    """Add request context to log entries"""
    
    def __call__(self, logger: logging.Logger, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
        # Add timestamp and service info
        event_dict["service"] = "cortex-backend"
        event_dict["version"] = getattr(settings, 'APP_VERSION', '1.0.0')
        event_dict["environment"] = getattr(settings, 'APP_ENV', 'development')
        return event_dict


def setup_logging() -> None:
    """Configure structured logging for the application"""
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, getattr(settings, 'LOG_LEVEL', 'INFO').upper(), logging.INFO),
    )
    
    # Configure structlog processors
    processors: list[Processor] = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        RequestContextProcessor(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    
    # Add development-friendly formatting for local development
    if getattr(settings, 'is_development', True):
        processors.append(
            structlog.dev.ConsoleRenderer(colors=True)
        )
    else:
        # Production: JSON formatting for log aggregation
        processors.append(
            structlog.processors.JSONRenderer()
        )
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = __name__) -> structlog.stdlib.BoundLogger:
    """Get a configured logger instance"""
    return structlog.get_logger(name)


# Configure logging on module import
setup_logging()

# Export commonly used loggers
logger = get_logger("cortex")
api_logger = get_logger("cortex.api")
db_logger = get_logger("cortex.database")
auth_logger = get_logger("cortex.auth")
validation_logger = get_logger("cortex.validation")
security_logger = get_logger("cortex.security")

# Debug-specific loggers for multi-office system
office_logger = get_logger("cortex.office")
appointment_logger = get_logger("cortex.appointment")
consultation_logger = get_logger("cortex.consultation")
whatsapp_logger = get_logger("cortex.whatsapp")
pdf_logger = get_logger("cortex.pdf")
migration_logger = get_logger("cortex.migration")