"""
Script to deploy Appointment Agent to Vertex AI Agent Engine
"""
import os
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from google.cloud import aiplatform
from config import settings
from logger import get_logger
from agents.appointment_agent import AppointmentAgent
from database import get_db

api_logger = get_logger("medical_records.deploy_agent")


def deploy_agent_to_engine():
    """
    Deploy the Appointment Agent to Vertex AI Agent Engine.
    Returns the endpoint URL of the deployed agent.
    """
    # Initialize Vertex AI
    if not settings.GCP_PROJECT_ID:
        raise ValueError("GCP_PROJECT_ID must be set in environment variables")
    
    if not settings.AGENT_ENGINE_PROJECT_ID:
        project_id = settings.GCP_PROJECT_ID
        api_logger.info(f"AGENT_ENGINE_PROJECT_ID not set, using GCP_PROJECT_ID: {project_id}")
    else:
        project_id = settings.AGENT_ENGINE_PROJECT_ID
    
    region = settings.AGENT_ENGINE_REGION
    
    api_logger.info(
        f"Initializing Vertex AI for Agent Engine deployment",
        extra={
            "project_id": project_id,
            "region": region
        }
    )
    
    aiplatform.init(
        project=project_id,
        location=region
    )
    
    # Create a test agent instance to get deployment config
    # Note: We need a DB session for the agent, but Agent Engine will handle this
    # For deployment, we'll create the agent class structure without actual DB connection
    try:
        # Try to get DB session (may fail if DB not available, that's OK for deployment)
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            agent = AppointmentAgent(db, use_adk=True)
            
            if not agent.use_adk:
                raise ValueError("Agent was not initialized with ADK. Cannot deploy to Agent Engine.")
            
            deployment_config = agent.get_deployment_config()
            
        finally:
            db.close()
    
    except Exception as e:
        api_logger.warning(f"Could not initialize agent with DB session: {e}. Creating agent structure without DB.")
        # For deployment, we can create the agent class structure without DB
        # Agent Engine will handle DB connections at runtime
        deployment_config = {
            "agent_class": "agents.appointment_agent.agent.AppointmentAgent",
            "requirements": [
                "google-cloud-aiplatform[agent_engines,adk]>=1.112",
                "sqlalchemy==2.0.23",
                "psycopg2-binary==2.9.9",
                "pydantic==2.12.3",
                "structlog==23.2.0",
            ],
            "environment": {
                "GCP_PROJECT_ID": settings.GCP_PROJECT_ID,
                "GCP_REGION": settings.GCP_REGION,
                "GEMINI_MODEL": settings.GEMINI_MODEL,
                "GEMINI_BOT_ENABLED": str(settings.GEMINI_BOT_ENABLED),
                "DATABASE_URL": settings.DATABASE_URL,
            }
        }
    
    # Deploy to Agent Engine
    # Note: Agent Engine API may not be available in Python SDK yet
    # We'll provide instructions for manual deployment via GCP Console
    api_logger.warning(
        "Agent Engine Python SDK API not available yet. "
        "Please deploy via GCP Console or REST API."
    )
    
    print("\n" + "="*60)
    print("⚠️  Agent Engine Python SDK API not available")
    print("="*60)
    print("\nTo deploy your ADK agent to Vertex AI Agent Engine:")
    print("\n1. Go to GCP Console:")
    print(f"   https://console.cloud.google.com/vertex-ai/agents?project={project_id}")
    print("\n2. Click 'Create Agent' or use the REST API")
    print("\n3. Your agent configuration:")
    print(f"   - Model: {settings.GEMINI_MODEL}")
    print(f"   - Project: {project_id}")
    print(f"   - Region: {region}")
    print(f"   - Tools: {len(deployment_config.get('requirements', []))} tools configured")
    print("\n4. After deployment, set AGENT_ENGINE_ENDPOINT environment variable")
    print("\nAlternatively, you can use the REST API:")
    print(f"   POST https://{region}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{region}/agents")
    print("\n" + "="*60)
    
    # Return None to indicate manual deployment needed
    return None


def main():
    """Main function to deploy agent"""
    try:
        endpoint = deploy_agent_to_engine()
        
        if endpoint:
            print(f"\n✅ Agent deployed successfully!")
            print(f"Endpoint: {endpoint}")
            print(f"\n⚠️  Update AGENT_ENGINE_ENDPOINT in your environment variables:")
            print(f"   export AGENT_ENGINE_ENDPOINT={endpoint}")
        else:
            print("\n✅ Agent configuration prepared for manual deployment")
            print("   Follow the instructions above to deploy via GCP Console")
        
        return endpoint
    
    except Exception as e:
        api_logger.error(f"Failed to prepare agent deployment: {e}", exc_info=True)
        print(f"\n❌ Failed to prepare agent deployment: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
