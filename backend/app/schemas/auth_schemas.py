from pydantic import BaseModel
from typing import Optional

class AuthResponse(BaseModel):
    success: bool
    message: str
    match_score: Optional[float] = None
    liveness_score: Optional[float] = None
    reason: Optional[str] = None

class IDPhotoUpload(BaseModel):
    user_id: str
    image_data: bytes

class LivePhotoVerification(BaseModel):
    user_id: str
    image_data: bytes 