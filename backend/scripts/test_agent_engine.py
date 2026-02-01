"""
Script to test Appointment Agent deployed in Vertex AI Agent Engine
"""
import os
import sys
import asyncio
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.agent_engine_client import call_agent_engine, is_agent_engine_available
from config import settings
from logger import get_logger

api_logger = get_logger("medical_records.test_agent_engine")


async def test_agent_engine():
    """Test the Agent Engine endpoint with sample messages"""
    
    if not is_agent_engine_available():
        print("❌ Agent Engine endpoint not configured")
        print("   Set AGENT_ENGINE_ENDPOINT environment variable")
        return False
    
    print(f"✅ Agent Engine endpoint configured: {settings.AGENT_ENGINE_ENDPOINT}")
    print()
    
    # Test cases
    test_cases = [
        {
            "phone": "+521234567890",
            "message": "Hola",
            "description": "Greeting test"
        },
        {
            "phone": "+521234567890",
            "message": "ayuda",
            "description": "Help command test"
        },
        {
            "phone": "+521234567890",
            "message": "cancelar",
            "description": "Cancel command test"
        },
        {
            "phone": "+521234567891",
            "message": "Quiero agendar una cita",
            "description": "Appointment request test"
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}/{len(test_cases)}: {test_case['description']}")
        print(f"  Phone: {test_case['phone']}")
        print(f"  Message: {test_case['message']}")
        
        try:
            response = await call_agent_engine(test_case['phone'], test_case['message'])
            
            if response:
                print(f"  ✅ Response received ({len(response)} chars)")
                print(f"  Response: {response[:100]}..." if len(response) > 100 else f"  Response: {response}")
                results.append({"test": test_case['description'], "status": "success", "response": response})
            else:
                print(f"  ❌ No response received")
                results.append({"test": test_case['description'], "status": "failed", "response": None})
        
        except Exception as e:
            print(f"  ❌ Error: {e}")
            results.append({"test": test_case['description'], "status": "error", "error": str(e)})
        
        print()
    
    # Summary
    print("=" * 60)
    print("Summary:")
    print(f"  Total tests: {len(test_cases)}")
    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"  Successful: {success_count}")
    failed_count = sum(1 for r in results if r['status'] in ['failed', 'error'])
    print(f"  Failed: {failed_count}")
    
    if success_count == len(test_cases):
        print("\n✅ All tests passed!")
        return True
    else:
        print(f"\n⚠️  {failed_count} test(s) failed")
        return False


async def test_local_fallback():
    """Test local agent fallback when Agent Engine is not available"""
    print("Testing local agent fallback...")
    print()
    
    # Temporarily disable Agent Engine endpoint
    original_endpoint = settings.AGENT_ENGINE_ENDPOINT
    settings.AGENT_ENGINE_ENDPOINT = None
    
    try:
        from agents.appointment_agent import AppointmentAgent
        from database import get_db
        
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            agent = AppointmentAgent(db, use_adk=False)
            
            test_phone = "+521234567890"
            test_message = "Hola"
            
            print(f"  Phone: {test_phone}")
            print(f"  Message: {test_message}")
            
            response = await agent.process_message(test_phone, test_message)
            
            if response:
                print(f"  ✅ Response received ({len(response)} chars)")
                print(f"  Response: {response[:100]}..." if len(response) > 100 else f"  Response: {response}")
                return True
            else:
                print(f"  ❌ No response received")
                return False
        
        finally:
            db.close()
    
    finally:
        settings.AGENT_ENGINE_ENDPOINT = original_endpoint


async def main():
    """Main function"""
    print("=" * 60)
    print("Agent Engine Testing")
    print("=" * 60)
    print()
    
    # Test Agent Engine if available
    if is_agent_engine_available():
        success = await test_agent_engine()
        
        if not success:
            print("\n⚠️  Some tests failed. Check Agent Engine configuration and deployment.")
            sys.exit(1)
    else:
        print("⚠️  Agent Engine endpoint not configured.")
        print("   Testing local fallback instead...")
        print()
        
        success = await test_local_fallback()
        
        if not success:
            print("\n❌ Local fallback test failed.")
            sys.exit(1)
        
        print("\n✅ Local fallback test passed!")
        print("   Note: Configure AGENT_ENGINE_ENDPOINT to test Agent Engine deployment.")


if __name__ == "__main__":
    asyncio.run(main())
