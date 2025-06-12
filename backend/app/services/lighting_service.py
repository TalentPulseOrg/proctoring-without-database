import cv2
import numpy as np
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class LightingService:
    def analyze_lighting(self, image_data: bytes) -> Dict:
        """
        Analyze the lighting conditions in an image
        Returns a dictionary with lighting analysis results
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Failed to decode image")

            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Calculate average brightness
            brightness = np.mean(gray)
            
            # Calculate contrast (standard deviation)
            contrast = np.std(gray)
            
            # Determine if lighting is adequate
            is_adequate = brightness >= 100 and contrast >= 50
            
            # Generate message based on conditions
            if brightness < 100:
                message = "Room is too dark. Please improve lighting."
            elif contrast < 50:
                message = "Low contrast detected. Please adjust lighting."
            else:
                message = "Lighting conditions are good."
            
            return {
                "is_adequate": is_adequate,
                "brightness": float(brightness),
                "contrast": float(contrast),
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Error analyzing lighting: {str(e)}", exc_info=True)
            return {
                "is_adequate": False,
                "brightness": 0,
                "contrast": 0,
                "message": f"Error analyzing lighting: {str(e)}"
            }

# Create singleton instance
lighting_service = LightingService() 