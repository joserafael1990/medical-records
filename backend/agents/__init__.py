"""
Agent Development Kit (ADK) configuration and initialization
"""
import os
from config import settings

# ADK Configuration
# Note: ADK uses Vertex AI under the hood, so we initialize Vertex AI here
import vertexai

def init_adk():
    """Initialize ADK with GCP project settings"""
    if not settings.GCP_PROJECT_ID:
        raise ValueError("GCP_PROJECT_ID must be set in environment variables")
    
    vertexai.init(
        project=settings.GCP_PROJECT_ID,
        location=settings.GCP_REGION
    )

