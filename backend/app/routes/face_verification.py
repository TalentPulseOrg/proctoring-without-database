from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.face_verification import FaceVerificationService
from typing import Dict

router = APIRouter()
face_service = FaceVerificationService()

class FaceVerificationRequest(BaseModel):
    first_image: str  # Base64 encoded image
    second_image: str  # Base64 encoded image

class LivenessDetectionRequest(BaseModel):
    image: str  # Base64 encoded image

@router.post("/verify-faces")
async def verify_faces(request: FaceVerificationRequest) -> Dict:
    """
    Compare two face images and return similarity score.
    """
    try:
        result = face_service.compare_faces(request.first_image, request.second_image)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect-liveness")
async def detect_liveness(request: LivenessDetectionRequest) -> Dict:
    """
    Detect liveness using multiple methods (blink detection and head movement).
    """
    try:
        result = face_service.detect_liveness(request.image)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 