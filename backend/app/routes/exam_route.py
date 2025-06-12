from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from ..routes.test_route import generate_test
from ..services.screenshot import ScreenshotService
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/exam", tags=["exam"])

# Create screenshot service instance
screenshot_service = ScreenshotService()

class ExamRequest(BaseModel):
    skill: str
    num_questions: int
    duration: int

class ExamResponse(BaseModel):
    test_id: str
    questions: List[Dict]
    duration: int
    skill: str

class Violation(BaseModel):
    timestamp: str
    type: str
    details: Optional[Dict] = None

class ScreenCapture(BaseModel):
    timestamp: str
    image_path: str

class AudioEvent(BaseModel):
    timestamp: str
    level: float
    type: str

class ExamResult(BaseModel):
    test_id: str
    score: int
    total: int
    timestamp: str
    skill: str
    violations: List[Violation]
    screen_captures: List[ScreenCapture]
    audio_events: List[AudioEvent]

@router.post("/start", response_model=ExamResponse)
async def start_exam(request: ExamRequest):
    """Start a new exam with the specified parameters"""
    try:
        # Generate test questions
        test_data = await generate_test(request)
        
        # Create exam response
        exam_response = ExamResponse(
            test_id=datetime.now().strftime("%Y%m%d%H%M%S"),
            questions=test_data["questions"],
            duration=request.duration,
            skill=request.skill
        )
        
        # Start screenshot service for this test
        try:
            if not screenshot_service.start_for_test(exam_response.test_id):
                logger.warning("Failed to start screenshot service, but continuing with exam")
                # Don't raise an error, just log the warning
        except Exception as e:
            logger.error(f"Error starting screenshot service: {str(e)}")
            # Don't raise an error, just log the error
        
        return exam_response
    except Exception as e:
        logger.error(f"Error starting exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit")
async def submit_exam(result: ExamResult):
    """Submit exam results and monitoring data"""
    try:
        # Store the result in a file
        result_dict = result.dict()
        result_dict["submitted_at"] = datetime.now().isoformat()
        
        # Save to a JSON file
        import json
        import os
        
        # Create results directory if it doesn't exist
        os.makedirs("results", exist_ok=True)
        
        # Save the result
        with open(f"results/exam_{result.test_id}.json", "w") as f:
            json.dump(result_dict, f, indent=2)
        
        # Stop screenshot service for this test
        try:
            screenshot_service.stop_for_test()
            logger.info(f"Stopped screenshot service for test {result.test_id}")
        except Exception as e:
            logger.error(f"Error stopping screenshot service: {str(e)}")
            # Don't raise an error, just log it
        
        return {"message": "Exam submitted successfully", "test_id": result.test_id}
    except Exception as e:
        logger.error(f"Error submitting exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{test_id}")
async def get_exam_status(test_id: str):
    """Get the current status of an exam"""
    try:
        is_active = screenshot_service.is_active()
        current_test_id = screenshot_service.get_current_test_id()
        
        return {
            "test_id": test_id,
            "is_active": is_active,
            "is_current_test": current_test_id == test_id,
            "screenshot_service_running": is_active
        }
    except Exception as e:
        logger.error(f"Error getting exam status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results")
async def get_all_results():
    """Get all test results"""
    try:
        import json
        import os
        from pathlib import Path
        
        results_dir = Path("results")
        if not results_dir.exists():
            return []
            
        all_results = []
        for result_file in results_dir.glob("exam_*.json"):
            try:
                with open(result_file, "r") as f:
                    result_data = json.load(f)
                    all_results.append(result_data)
            except Exception as e:
                logger.error(f"Error reading result file {result_file}: {str(e)}")
                continue
                
        # Sort by timestamp in descending order (newest first)
        all_results.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return all_results
    except Exception as e:
        logger.error(f"Error getting all results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/{test_id}")
async def get_test_logs(test_id: str):
    """Get all logs for a specific test"""
    try:
        import json
        import os
        from pathlib import Path
        
        # Get test result file
        result_file = Path("results") / f"exam_{test_id}.json"
        if not result_file.exists():
            raise HTTPException(status_code=404, detail="Test not found")
            
        # Read test result
        with open(result_file, "r") as f:
            result_data = json.load(f)
            
        # Combine all logs
        logs = []
        
        # Add violations as logs
        for violation in result_data.get("violations", []):
            logs.append({
                "type": violation.get("type", "unknown"),
                "timestamp": violation.get("timestamp"),
                "severity": "high",
                "details": violation.get("details", {})
            })
            
        # Add screen captures as logs
        for capture in result_data.get("screen_captures", []):
            logs.append({
                "type": "screen_capture",
                "timestamp": capture.get("timestamp"),
                "severity": "medium",
                "details": {
                    "image_path": capture.get("image_path")
                }
            })
            
        # Add audio events as logs
        for event in result_data.get("audio_events", []):
            logs.append({
                "type": event.get("type", "unknown"),
                "timestamp": event.get("timestamp"),
                "severity": "medium" if float(event.get("level", 0)) > 0.5 else "low",
                "details": {
                    "level": event.get("level")
                }
            })
            
        # Sort logs by timestamp
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return logs
    except Exception as e:
        logger.error(f"Error getting test logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/results/{test_id}")
async def delete_test_result(test_id: str):
    """Delete a specific test result"""
    try:
        import os
        from pathlib import Path
        
        result_file = Path("results") / f"exam_{test_id}.json"
        if not result_file.exists():
            raise HTTPException(status_code=404, detail="Test result not found")
            
        # Delete the result file
        result_file.unlink()
        
        return {"message": f"Test result {test_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting test result: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/results")
async def delete_all_results():
    """Delete all test results"""
    try:
        import os
        from pathlib import Path
        
        results_dir = Path("results")
        if not results_dir.exists():
            return {"message": "No test results found"}
            
        # Delete all exam result files
        for result_file in results_dir.glob("exam_*.json"):
            try:
                result_file.unlink()
            except Exception as e:
                logger.error(f"Error deleting file {result_file}: {str(e)}")
                continue
                
        return {"message": "All test results deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting all test results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 