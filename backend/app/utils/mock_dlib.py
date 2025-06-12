"""
Mock implementation of dlib to avoid dependency issues.
This provides the minimum functionality needed for the gaze tracking.
"""

import cv2
import numpy as np

class Point:
    """Represents a point with x, y coordinates."""
    def __init__(self, x, y):
        self.x = x
        self.y = y

class Rectangle:
    """Represents a rectangle with left, top, right, bottom coordinates."""
    def __init__(self, left, top, right, bottom):
        self.left_val = left
        self.top_val = top
        self.right_val = right
        self.bottom_val = bottom
    
    def left(self):
        return self.left_val
    
    def top(self):
        return self.top_val
    
    def right(self):
        return self.right_val
    
    def bottom(self):
        return self.bottom_val
    
    def width(self):
        return self.right_val - self.left_val
    
    def height(self):
        return self.bottom_val - self.top_val

class ShapePredictor:
    """Mock implementation of dlib's shape predictor."""
    def __init__(self, model_path):
        # We don't actually load the model, just use OpenCV
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    
    def __call__(self, image, rect):
        # Instead of actual facial landmark detection, we'll create synthetic landmarks
        # based on the face rectangle and OpenCV eye detection
        landmarks = MockLandmarks()
        
        # Extract face region
        face_x = rect.left()
        face_y = rect.top()
        face_w = rect.width()
        face_h = rect.height()
        
        # Find eyes using OpenCV
        face_roi = image[face_y:face_y+face_h, face_x:face_x+face_w]
        eyes = self.eye_cascade.detectMultiScale(face_roi, 1.3, 5)
        
        if len(eyes) >= 2:
            # Sort eyes by x-coordinate
            eyes = sorted(eyes, key=lambda x: x[0])[:2]
            
            # Left eye
            left_eye_x, left_eye_y, left_eye_w, left_eye_h = eyes[0]
            left_eye_center_x = face_x + left_eye_x + left_eye_w // 2
            left_eye_center_y = face_y + left_eye_y + left_eye_h // 2
            
            # Right eye
            right_eye_x, right_eye_y, right_eye_w, right_eye_h = eyes[1]
            right_eye_center_x = face_x + right_eye_x + right_eye_w // 2
            right_eye_center_y = face_y + right_eye_y + right_eye_h // 2
            
            # Create synthetic landmarks for left eye (points 36-41)
            r = min(left_eye_w, left_eye_h) // 3
            for i, angle in enumerate(range(0, 360, 60)):
                rad = angle * np.pi / 180
                x = int(left_eye_center_x + r * np.cos(rad))
                y = int(left_eye_center_y + r * np.sin(rad))
                landmarks.parts[36 + i] = Point(x, y)
            
            # Create synthetic landmarks for right eye (points 42-47)
            r = min(right_eye_w, right_eye_h) // 3
            for i, angle in enumerate(range(0, 360, 60)):
                rad = angle * np.pi / 180
                x = int(right_eye_center_x + r * np.cos(rad))
                y = int(right_eye_center_y + r * np.sin(rad))
                landmarks.parts[42 + i] = Point(x, y)
        else:
            # If eyes not detected, create synthetic landmarks
            face_center_x = face_x + face_w // 2
            face_center_y = face_y + face_h // 2
            
            # Left eye position - 1/3 from top, 1/3 from left
            left_eye_center_x = face_x + face_w // 3
            left_eye_center_y = face_y + face_h // 3
            
            # Right eye position - 1/3 from top, 2/3 from left
            right_eye_center_x = face_x + 2 * face_w // 3
            right_eye_center_y = face_y + face_h // 3
            
            # Create synthetic landmarks for left eye (points 36-41)
            r = face_w // 12
            for i, angle in enumerate(range(0, 360, 60)):
                rad = angle * np.pi / 180
                x = int(left_eye_center_x + r * np.cos(rad))
                y = int(left_eye_center_y + r * np.sin(rad))
                landmarks.parts[36 + i] = Point(x, y)
            
            # Create synthetic landmarks for right eye (points 42-47)
            for i, angle in enumerate(range(0, 360, 60)):
                rad = angle * np.pi / 180
                x = int(right_eye_center_x + r * np.cos(rad))
                y = int(right_eye_center_y + r * np.sin(rad))
                landmarks.parts[42 + i] = Point(x, y)
        
        return landmarks

class MockLandmarks:
    """Mock implementation of dlib's full_object_detection."""
    def __init__(self):
        # Pre-allocate 68 facial landmarks
        self.parts = [Point(0, 0) for _ in range(68)]
    
    def part(self, idx):
        """Get the landmark point at the given index."""
        return self.parts[idx]

def get_frontal_face_detector():
    """Returns a mock face detector."""
    return FaceDetector()

def shape_predictor(model_path):
    """Returns a mock shape predictor."""
    return ShapePredictor(model_path)

class FaceDetector:
    """Mock implementation of dlib's face detector."""
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    def __call__(self, image):
        """Detect faces in the image."""
        faces = self.face_cascade.detectMultiScale(image, 1.3, 5)
        return [Rectangle(x, y, x + w, y + h) for x, y, w, h in faces] 