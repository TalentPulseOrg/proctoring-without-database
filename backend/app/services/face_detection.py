import face_recognition
import numpy as np
import cv2
from datetime import datetime
import os
from typing import Tuple, Dict
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class FaceDetectionService:
    def __init__(self):
        self.suspicious_images_dir = "suspicious_images"
        os.makedirs(self.suspicious_images_dir, exist_ok=True)
        logger.info(f"Initialized FaceDetectionService. Suspicious images will be saved to: {os.path.abspath(self.suspicious_images_dir)}")

    def process_image(self, image_data: bytes) -> Dict:
        """
        Process the image to detect faces and determine if it's suspicious
        """
        try:
            logger.debug("Processing new image...")
            
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                logger.error("Failed to decode image")
                return {"error": "Failed to decode image", "face_count": 0, "is_suspicious": False}
            
            logger.debug(f"Image decoded successfully. Shape: {img.shape}")
            
            # Convert BGR to RGB (face_recognition uses RGB)
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Detect faces
            face_locations = face_recognition.face_locations(rgb_img)
            face_count = len(face_locations)
            
            logger.debug(f"Detected {face_count} faces in the image")
            
            # Determine if suspicious (more than one face)
            is_suspicious = face_count > 1
            
            result = {
                "face_count": face_count,
                "is_suspicious": is_suspicious,
                "timestamp": datetime.now().isoformat()
            }
            
            # If suspicious, save the image
            if is_suspicious:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{self.suspicious_images_dir}/suspicious_{timestamp}.jpg"
                save_path = os.path.abspath(filename)
                cv2.imwrite(save_path, img)
                logger.warning(f"Suspicious activity detected! Saved image to: {save_path}")
                result["saved_image_path"] = save_path
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}", exc_info=True)
            return {
                "error": str(e),
                "face_count": 0,
                "is_suspicious": False
            }

face_detection_service = FaceDetectionService() 