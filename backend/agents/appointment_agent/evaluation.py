"""
Evaluation and testing utilities for Appointment Agent
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .agent import AppointmentAgent
from logger import get_logger

api_logger = get_logger("medical_records.adk_agent")


# Test cases for agent evaluation
TEST_CASES = [
    {
        "input": "Hola",
        "expected_tool": None,
        "expected_response_contains": ["doctor", "bienvenido", "agendar"],
        "description": "Greeting should mention doctors or appointment"
    },
    {
        "input": "Quiero cita con Dr. Garcia",
        "expected_tool": "get_active_doctors",
        "expected_response_contains": ["doctor", "garcia"],
        "description": "Should call get_active_doctors when doctor is mentioned"
    },
    {
        "input": "Para mañana a las 10",
        "expected_tool": "get_available_slots",
        "expected_response_contains": ["horario", "disponible", "fecha"],
        "description": "Should call get_available_slots when date/time is mentioned"
    },
    {
        "input": "cancelar",
        "expected_tool": None,
        "expected_response_contains": ["cancelado"],
        "description": "Should handle cancel command"
    },
    {
        "input": "ayuda",
        "expected_tool": None,
        "expected_response_contains": ["ayuda", "paso"],
        "description": "Should provide help information"
    }
]


async def evaluate_agent(agent: AppointmentAgent, test_cases: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Evaluate agent performance on test cases.
    
    Args:
        agent: AppointmentAgent instance
        test_cases: List of test cases (defaults to TEST_CASES)
    
    Returns:
        Dictionary with evaluation results
    """
    if test_cases is None:
        test_cases = TEST_CASES
    
    results = {
        "total_tests": len(test_cases),
        "passed": 0,
        "failed": 0,
        "test_results": []
    }
    
    for test_case in test_cases:
        test_phone = "+521234567890"  # Test phone number
        input_text = test_case["input"]
        expected_tool = test_case.get("expected_tool")
        expected_contains = test_case.get("expected_response_contains", [])
        
        try:
            # Process message
            response = await agent.process_message(test_phone, input_text)
            
            # Check if response contains expected keywords
            response_lower = response.lower()
            contains_check = all(keyword.lower() in response_lower for keyword in expected_contains) if expected_contains else True
            
            # Note: Tool usage check would require instrumentation
            # For now, we just check response content
            
            test_passed = contains_check
            
            results["test_results"].append({
                "input": input_text,
                "response": response[:100] + "..." if len(response) > 100 else response,
                "expected_tool": expected_tool,
                "expected_contains": expected_contains,
                "passed": test_passed,
                "description": test_case.get("description", "")
            })
            
            if test_passed:
                results["passed"] += 1
            else:
                results["failed"] += 1
        
        except Exception as e:
            api_logger.error(f"Error in test case '{input_text}': {e}", exc_info=True)
            results["test_results"].append({
                "input": input_text,
                "error": str(e),
                "passed": False
            })
            results["failed"] += 1
    
    results["success_rate"] = results["passed"] / results["total_tests"] if results["total_tests"] > 0 else 0
    
    return results


def run_evaluation(db: Session) -> Dict[str, Any]:
    """
    Run evaluation on Appointment Agent.
    
    Args:
        db: Database session
    
    Returns:
        Evaluation results
    """
    agent = AppointmentAgent(db)
    # Note: This is a synchronous wrapper, but process_message is async
    # In practice, this should be called from an async context
    api_logger.info("Starting agent evaluation...")
    return {"message": "Evaluation should be run in async context using evaluate_agent()"}

