"""
Logging utilities for consistent logger initialization across the application
"""

from logger import get_logger


def get_api_logger():
    """Get the API logger instance"""
    return get_logger("medical_records.api")


def get_security_logger():
    """Get the security logger instance"""
    return get_logger("medical_records.security")


def get_service_logger(service_name: str):
    """
    Get a logger for a specific service
    
    Args:
        service_name: Name of the service (e.g., 'patient', 'doctor', 'appointment')
    
    Returns:
        Logger instance for the service
    """
    return get_logger(f"medical_records.services.{service_name}")
