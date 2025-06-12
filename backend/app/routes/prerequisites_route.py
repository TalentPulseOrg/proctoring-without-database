from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any

router = APIRouter()

class CheckResult(BaseModel):
    status: str
    message: str

class PrerequisitesCheck(BaseModel):
    camera: CheckResult
    microphone: CheckResult
    browser: CheckResult
    internet: CheckResult

@router.post("/api/prerequisites/check")
async def check_prerequisites(check_data: PrerequisitesCheck):
    try:
        # Log the prerequisites check results
        check_results = {
            'camera': check_data.camera.status,
            'microphone': check_data.microphone.status,
            'browser': check_data.browser.status,
            'internet': check_data.internet.status,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Here you can add code to store these results in a database
        # For now, we'll just return a success response
        
        return {
            'status': 'success',
            'message': 'Prerequisites check results recorded',
            'data': check_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 