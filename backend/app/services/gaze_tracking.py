import cv2
import numpy as np
import mediapipe as mp
from datetime import datetime
import os
import logging
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('gaze_tracking.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class GazeTracking:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("GazeTracking service initialized")

    def analyze_gaze(self, image_path):
        try:
            logger.info(f"Analyzing gaze for image: {image_path}")
            
            # Read the image
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Could not read image: {image_path}")
                raise ValueError("Could not read image")

            # Convert to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Process the image
            results = self.face_mesh.process(image_rgb)
            
            if not results.multi_face_landmarks:
                logger.warning("No face detected in the image")
                return {
                    'status': 'no_face',
                    'message': 'No face detected',
                    'timestamp': datetime.now().isoformat()
                }

            # Get face landmarks
            face_landmarks = results.multi_face_landmarks[0]
            
            # Get eye landmarks
            left_eye = face_landmarks.landmark[33]  # Left eye center
            right_eye = face_landmarks.landmark[263]  # Right eye center
            nose = face_landmarks.landmark[1]  # Nose tip

            # Calculate gaze direction
            eye_center_x = (left_eye.x + right_eye.x) / 2
            threshold = 0.1

            # Determine gaze direction
            if abs(eye_center_x - nose.x) > threshold:
                direction = 'left' if eye_center_x < nose.x else 'right'
            else:
                direction = 'center'

            # Calculate eye aspect ratio for blink detection
            left_eye_height = abs(face_landmarks.landmark[159].y - face_landmarks.landmark[145].y)
            left_eye_width = abs(face_landmarks.landmark[33].x - face_landmarks.landmark[133].x)
            eye_aspect_ratio = left_eye_height / left_eye_width

            # Determine if looking away
            is_looking_away = direction != 'center' or eye_aspect_ratio > 0.3

            result = {
                'status': 'success',
                'is_looking_away': is_looking_away,
                'direction': direction,
                'eye_aspect_ratio': float(eye_aspect_ratio),
                'timestamp': datetime.now().isoformat()
            }

            # Log the result
            logger.info(f"Gaze analysis result: {json.dumps(result, indent=2)}")

            # Save debug image with landmarks
            debug_image = image.copy()
            for landmark in face_landmarks.landmark:
                x = int(landmark.x * image.shape[1])
                y = int(landmark.y * image.shape[0])
                cv2.circle(debug_image, (x, y), 1, (0, 255, 0), -1)
            
            debug_path = os.path.join(os.path.dirname(image_path), 'debug', os.path.basename(image_path))
            os.makedirs(os.path.dirname(debug_path), exist_ok=True)
            cv2.imwrite(debug_path, debug_image)
            logger.info(f"Debug image saved: {debug_path}")

            return result

        except Exception as e:
            logger.error(f"Error in gaze analysis: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def __del__(self):
        self.face_mesh.close()
        logger.info("GazeTracking service closed")

# Create a singleton instance
gaze_tracker = GazeTracking() 