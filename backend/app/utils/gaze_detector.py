import cv2
import numpy as np
import dlib
from typing import Tuple, Optional

class GazeDetector:
    def __init__(self):
        # Initialize face detector and facial landmark predictor
        self.detector = dlib.get_frontal_face_detector()
        # Download the shape predictor file if not exists
        predictor_path = "shape_predictor_68_face_landmarks.dat"
        try:
            self.predictor = dlib.shape_predictor(predictor_path)
        except:
            import urllib.request
            url = "http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2"
            urllib.request.urlretrieve(url, predictor_path + ".bz2")
            import bz2
            with bz2.open(predictor_path + ".bz2", 'rb') as source, open(predictor_path, 'wb') as dest:
                dest.write(source.read())
            self.predictor = dlib.shape_predictor(predictor_path)

    def get_eye_aspect_ratio(self, eye_points: np.ndarray) -> float:
        """Calculate the eye aspect ratio to determine if eyes are open."""
        # Compute the euclidean distances between the vertical eye landmarks
        A = np.linalg.norm(eye_points[1] - eye_points[5])
        B = np.linalg.norm(eye_points[2] - eye_points[4])
        # Compute the euclidean distance between the horizontal eye landmarks
        C = np.linalg.norm(eye_points[0] - eye_points[3])
        # Calculate the eye aspect ratio
        ear = (A + B) / (2.0 * C)
        return ear

    def get_gaze_ratio(self, frame: np.ndarray, eye_points: np.ndarray) -> float:
        """Calculate the gaze ratio to determine gaze direction."""
        # Create a mask for the eye region
        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [eye_points], 255)
        eye = cv2.bitwise_and(frame, frame, mask=mask)
        
        # Convert to grayscale
        eye = cv2.cvtColor(eye, cv2.COLOR_BGR2GRAY)
        
        # Threshold to get the iris
        _, threshold_eye = cv2.threshold(eye, 70, 255, cv2.THRESH_BINARY)
        
        # Calculate the gaze ratio
        height, width = threshold_eye.shape
        left_side = threshold_eye[0:height, 0:width//2]
        right_side = threshold_eye[0:height, width//2:]
        
        left_white = cv2.countNonZero(left_side)
        right_white = cv2.countNonZero(right_side)
        
        if left_white == 0:
            gaze_ratio = 1
        elif right_white == 0:
            gaze_ratio = 5
        else:
            gaze_ratio = left_white / right_white
        return gaze_ratio

    def detect_gaze(self, frame: np.ndarray) -> Tuple[str, float]:
        """Detect gaze direction from the input frame."""
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.detector(gray)
        if len(faces) == 0:
            return "no_face", 0.0
        
        face = faces[0]
        landmarks = self.predictor(gray, face)
        
        # Convert landmarks to numpy array
        landmarks_points = np.array([[p.x, p.y] for p in landmarks.parts()])
        
        # Get eye regions
        left_eye = landmarks_points[36:42]
        right_eye = landmarks_points[42:48]
        
        # Calculate eye aspect ratios
        left_ear = self.get_eye_aspect_ratio(left_eye)
        right_ear = self.get_eye_aspect_ratio(right_eye)
        
        # If eyes are closed, return "closed"
        if left_ear < 0.2 or right_ear < 0.2:
            return "closed", 0.0
        
        # Calculate gaze ratios
        left_gaze_ratio = self.get_gaze_ratio(frame, left_eye)
        right_gaze_ratio = self.get_gaze_ratio(frame, right_eye)
        
        # Average gaze ratio
        gaze_ratio = (left_gaze_ratio + right_gaze_ratio) / 2
        
        # Determine gaze direction
        if gaze_ratio <= 0.7:
            return "right", gaze_ratio
        elif gaze_ratio >= 1.3:
            return "left", gaze_ratio
        else:
            return "center", gaze_ratio 