from fastapi import APIRouter, File, UploadFile, Form
from ..schemas.auth_schemas import AuthResponse
from ..services.face_auth_service import FaceAuthService
from ..utils.error_handlers import (
    ValidationException,
    ResourceNotFoundException,
    ServerException,
    AuthenticationException
)
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
face_auth_service = FaceAuthService()

@router.post("/upload-id-photo", response_model=AuthResponse)
async def upload_id_photo(
    user_id: str = Form(...),
    image_data: UploadFile = File(...)
):
    """Upload ID photo for a user"""
    try:
        logger.info(f"Received ID photo upload request for user {user_id}")
        contents = await image_data.read()
        
        if not contents:
            raise ValidationException("Empty file received", "EMPTY_FILE")
            
        if not image_data.content_type.startswith('image/'):
            raise ValidationException("Invalid file type. Only images are allowed", "INVALID_FILE_TYPE")
            
        success = face_auth_service.save_id_photo(user_id, contents)
        if not success:
            raise ServerException("Failed to save ID photo", "SAVE_FAILED")
            
        logger.info(f"ID photo uploaded successfully for user {user_id}")
        return AuthResponse(
            success=True,
            message="ID photo uploaded successfully"
        )
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_id_photo: {str(e)}")
        raise ServerException("Failed to process ID photo upload", "UPLOAD_FAILED")

@router.post("/verify-face", response_model=AuthResponse)
async def verify_face(
    user_id: str = Form(...),
    image_data: UploadFile = File(...)
):
    """Verify live photo against stored ID photo"""
    try:
        logger.info(f"Received face verification request for user {user_id}")
        contents = await image_data.read()
        
        if not contents:
            raise ValidationException("Empty file received", "EMPTY_FILE")
            
        if not image_data.content_type.startswith('image/'):
            raise ValidationException("Invalid file type. Only images are allowed", "INVALID_FILE_TYPE")
            
        # Get stored ID photo
        id_photo = face_auth_service.get_id_photo(user_id)
        if not id_photo:
            raise ResourceNotFoundException("ID photo not found", "ID_PHOTO_NOT_FOUND")
            
        # Compare faces
        match, match_score = face_auth_service.compare_faces(id_photo, contents)
        
        # Check liveness
        liveness_result = face_auth_service.detect_liveness(contents)
        
        if match and liveness_result["is_live"]:
            logger.info(f"Face verification successful for user {user_id}")
            return AuthResponse(
                success=True,
                message="Face verification successful",
                match_score=match_score,
                liveness_score=liveness_result["confidence"]
            )
        else:
            logger.warning(f"Face verification failed for user {user_id}")
            return AuthResponse(
                success=False,
                message="Face verification failed",
                match_score=match_score,
                liveness_score=liveness_result["confidence"],
                reason=liveness_result["reason"]
            )
    except (ValidationException, ResourceNotFoundException):
        raise
    except Exception as e:
        logger.error(f"Error in verify_face: {str(e)}")
        raise ServerException("Failed to process face verification", "VERIFICATION_FAILED")

@router.post("/check-liveness", response_model=AuthResponse)
async def check_liveness(
    image_data: UploadFile = File(...)
):
    """Check if the photo is of a live person"""
    try:
        logger.info("Received liveness check request")
        contents = await image_data.read()
        
        if not contents:
            raise ValidationException("Empty file received", "EMPTY_FILE")
            
        if not image_data.content_type.startswith('image/'):
            raise ValidationException("Invalid file type. Only images are allowed", "INVALID_FILE_TYPE")
            
        result = face_auth_service.detect_liveness(contents)
        
        if result["is_live"]:
            logger.info("Liveness check passed")
            return AuthResponse(
                success=True,
                message="Liveness check passed",
                liveness_score=result["confidence"]
            )
        else:
            logger.warning("Liveness check failed")
            return AuthResponse(
                success=False,
                message="Liveness check failed",
                liveness_score=result["confidence"],
                reason=result["reason"]
            )
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Error in check_liveness: {str(e)}")
        raise ServerException("Failed to process liveness check", "LIVENESS_CHECK_FAILED") 