import cv2
import numpy as np
from datetime import datetime
import os
from .. import pose_predictor_model_location, face_recognition_model_location

# Try to import dlib, fall back to our mock implementation if it fails
try:
    import dlib
    print("Using real dlib library")
except ImportError:
    try:
        from .mock_dlib import get_frontal_face_detector, shape_predictor
        dlib = type('dlib', (), {
            'get_frontal_face_detector': get_frontal_face_detector,
            'shape_predictor': shape_predictor
        })
        print("Using mock dlib implementation")
    except ImportError:
        print("ERROR: Neither dlib nor mock_dlib is available")

class GazeTracker:
    def __init__(self):
        # Initialize dlib's face detector and facial landmark predictor
        self.detector = dlib.get_frontal_face_detector()
        
        # Load the shape predictor model (for facial landmarks)
        model_path = pose_predictor_model_location()
        if os.path.exists(model_path):
            self.predictor = dlib.shape_predictor(model_path)
            self.using_dlib_models = True
            print(f"Using facial landmark model from {model_path}")
        else:
            # Fallback to OpenCV's Haar cascades
            self.using_dlib_models = False
            print(f"Model not found at {model_path}, falling back to OpenCV")
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # Create snapshots directory if it doesn't exist
        self.snapshots_dir = "snapshots"
        os.makedirs(self.snapshots_dir, exist_ok=True)
        
        # Debug directory for saving processed images
        self.debug_dir = "debug_images"
        os.makedirs(self.debug_dir, exist_ok=True)

    def detect_eyes_and_pupils(self, frame):
        """Detect eyes in the frame and attempt to locate pupils"""
        if self.using_dlib_models:
            return self._detect_eyes_dlib(frame)
        else:
            return self._detect_eyes_opencv(frame)
    
    def _detect_eyes_dlib(self, frame):
        """Detect eyes using dlib's facial landmarks"""
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces using dlib
        faces = self.detector(gray)
        
        if len(faces) == 0:
            return None, None, None
        
        # Get the first face
        face = faces[0]
        
        # Get facial landmarks
        landmarks = self.predictor(gray, face)
        
        # Convert face rect to (x, y, w, h) format for compatibility
        face_rect = (face.left(), face.top(), face.width(), face.height())
        
        # Extract eye regions based on landmarks
        # Left eye landmarks (36-41)
        left_eye_pts = []
        for i in range(36, 42):
            point = landmarks.part(i)
            left_eye_pts.append((point.x, point.y))
        left_eye_pts = np.array(left_eye_pts)
        
        # Right eye landmarks (42-47)
        right_eye_pts = []
        for i in range(42, 48):
            point = landmarks.part(i)
            right_eye_pts.append((point.x, point.y))
        right_eye_pts = np.array(right_eye_pts)
        
        # Get eye bounding boxes
        left_eye_x, left_eye_y = np.min(left_eye_pts, axis=0)
        left_eye_w = np.max(left_eye_pts[:, 0]) - left_eye_x
        left_eye_h = np.max(left_eye_pts[:, 1]) - left_eye_y
        left_eye = (int(left_eye_x - face.left()), int(left_eye_y - face.top()), 
                    int(left_eye_w), int(left_eye_h))
        
        right_eye_x, right_eye_y = np.min(right_eye_pts, axis=0)
        right_eye_w = np.max(right_eye_pts[:, 0]) - right_eye_x
        right_eye_h = np.max(right_eye_pts[:, 1]) - right_eye_y
        right_eye = (int(right_eye_x - face.left()), int(right_eye_y - face.top()), 
                     int(right_eye_w), int(right_eye_h))
        
        # Calculate pupil positions
        left_pupil = self._calculate_pupil_position(frame, left_eye_pts, face_rect)
        right_pupil = self._calculate_pupil_position(frame, right_eye_pts, face_rect)
        
        # Debug images
        debug_img = frame.copy()
        
        # Draw eye landmarks
        for point in left_eye_pts:
            cv2.circle(debug_img, point, 2, (0, 255, 0), -1)
        for point in right_eye_pts:
            cv2.circle(debug_img, point, 2, (0, 255, 0), -1)
        
        # Draw pupil positions
        if left_pupil[0] is not None:
            rel_x, rel_y = left_pupil
            x = int(left_eye_x + rel_x * left_eye_w)
            y = int(left_eye_y + rel_y * left_eye_h)
            cv2.circle(debug_img, (x, y), 3, (0, 0, 255), -1)
        
        if right_pupil[0] is not None:
            rel_x, rel_y = right_pupil
            x = int(right_eye_x + rel_x * right_eye_w)
            y = int(right_eye_y + rel_y * right_eye_h)
            cv2.circle(debug_img, (x, y), 3, (0, 0, 255), -1)
        
        # Save debug image
        timestamp = datetime.now().timestamp()
        debug_path = os.path.join(self.debug_dir, f"dlib_eyes_{timestamp}.jpg")
        cv2.imwrite(debug_path, debug_img)
        
        return [left_eye, right_eye], [left_pupil, right_pupil], face_rect
    
    def _calculate_pupil_position(self, frame, eye_pts, face_rect):
        """Calculate pupil position relative to eye"""
        face_x, face_y, face_w, face_h = face_rect
        
        # Get eye region
        eye_x, eye_y = np.min(eye_pts, axis=0)
        eye_w = np.max(eye_pts[:, 0]) - eye_x
        eye_h = np.max(eye_pts[:, 1]) - eye_y
        
        # Create a mask for the eye region
        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [eye_pts], 255)
        
        # Apply mask to get only the eye region
        eye_region = cv2.bitwise_and(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), mask)
        
        # Threshold to find the pupil (darkest part)
        _, thresh = cv2.threshold(eye_region, 55, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours in the thresholded image
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return (0.5, 0.5)  # Default to center if no pupil found
        
        # Find the largest contour (probably the pupil)
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Get the centroid of the contour
        M = cv2.moments(largest_contour)
        if M["m00"] == 0:
            return (0.5, 0.5)
            
        pupil_x = int(M["m10"] / M["m00"])
        pupil_y = int(M["m01"] / M["m00"])
        
        # Calculate relative position
        rel_x = (pupil_x - eye_x) / eye_w if eye_w > 0 else 0.5
        rel_y = (pupil_y - eye_y) / eye_h if eye_h > 0 else 0.5
        
        return (rel_x, rel_y)
    
    def _detect_eyes_opencv(self, frame):
        """Fallback method using OpenCV's Haar cascades"""
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            return None, None, None
        
        # Get the first face
        face = faces[0]
        face_x, face_y, face_w, face_h = face
        face_roi_gray = gray[face_y:face_y+face_h, face_x:face_x+face_w]
        face_roi_color = frame[face_y:face_y+face_h, face_x:face_x+face_w]
        
        # Detect eyes within the face region
        eyes = self.eye_cascade.detectMultiScale(face_roi_gray)
        
        if len(eyes) < 2:
            return None, None, face
        
        # Process up to 2 eyes
        processed_eyes = []
        pupils = []
        
        # Sort eyes by x-coordinate to get left and right
        eyes = sorted(eyes, key=lambda x: x[0])[:2]
        
        for i, (eye_x, eye_y, eye_w, eye_h) in enumerate(eyes):
            # Get eye region
            eye_roi = face_roi_gray[eye_y:eye_y+eye_h, eye_x:eye_x+eye_w]
            
            # Apply histogram equalization to enhance contrast
            eye_roi = cv2.equalizeHist(eye_roi)
            
            # Create debug image
            debug_roi = cv2.cvtColor(eye_roi, cv2.COLOR_GRAY2BGR)
            
            # Find the pupil using a simple thresholding approach
            _, thresh = cv2.threshold(eye_roi, 50, 255, cv2.THRESH_BINARY_INV)
            
            # Apply morphological operations to reduce noise
            kernel = np.ones((3, 3), np.uint8)
            thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)
            thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Find the largest contour (likely to be the pupil)
            pupil_x, pupil_y = None, None
            
            if contours:
                largest_contour = max(contours, key=cv2.contourArea)
                
                # Get the centroid of the contour
                M = cv2.moments(largest_contour)
                if M["m00"] > 0:  # Avoid division by zero
                    pupil_x = int(M["m10"] / M["m00"])
                    pupil_y = int(M["m01"] / M["m00"])
                    
                    # Draw the pupil on debug image
                    cv2.circle(debug_roi, (pupil_x, pupil_y), 3, (0, 255, 0), -1)
            
            # If pupil was found, calculate relative position
            if pupil_x is not None and pupil_y is not None:
                # Calculate relative position within the eye
                rel_x = pupil_x / eye_w
                rel_y = pupil_y / eye_h
                pupils.append((rel_x, rel_y))
            else:
                # If pupil not found, use center of eye as fallback
                pupils.append((0.5, 0.5))
            
            # Save debug image
            timestamp = datetime.now().timestamp()
            debug_path = os.path.join(self.debug_dir, f"eye_{i}_{timestamp}.jpg")
            cv2.imwrite(debug_path, debug_roi)
            
            # Add to processed eyes
            processed_eyes.append((eye_x, eye_y, eye_w, eye_h))
        
        return processed_eyes, pupils, face

    def analyze_gaze(self, image_path):
        """Analyze gaze direction from an image"""
        try:
            # Read the image
            frame = cv2.imread(image_path)
            if frame is None:
                return {"error": "Could not read image"}

            # Save a debug copy of the original image
            timestamp = datetime.now().timestamp()
            debug_orig_path = os.path.join(self.debug_dir, f"original_{timestamp}.jpg")
            cv2.imwrite(debug_orig_path, frame)

            # Detect eyes and pupils
            eyes, pupils, face = self.detect_eyes_and_pupils(frame)
            
            if eyes is None or len(eyes) < 2:
                return {
                    "gaze_direction": "no_face",
                    "confidence": 0.0,
                    "timestamp": datetime.now().isoformat()
                }

            # Calculate average pupil position
            avg_pupil_x = sum(p[0] for p in pupils) / len(pupils)
            avg_pupil_y = sum(p[1] for p in pupils) / len(pupils)
            
            # Determine gaze direction
            direction = "center"
            confidence = 0.7
            
            # Horizontal gaze
            if avg_pupil_x < 0.4:
                direction = "right"  # Pupil on left side means looking right
                confidence = 0.8
            elif avg_pupil_x > 0.6:
                direction = "left"   # Pupil on right side means looking left
                confidence = 0.8
            
            # Vertical gaze
            if avg_pupil_y < 0.4:
                direction = "down"   # Pupil on top means looking down
                confidence = 0.8
            elif avg_pupil_y > 0.6:
                direction = "up"     # Pupil on bottom means looking up
                confidence = 0.8
            
            # Debug image with gaze direction
            debug_img = frame.copy()
            
            if self.using_dlib_models:
                # Draw face rectangle
                face_x, face_y, face_w, face_h = face
                cv2.rectangle(debug_img, (face_x, face_y), (face_x+face_w, face_y+face_h), (255, 0, 0), 2)
            else:
                # Draw face and eyes from OpenCV detection
                face_x, face_y, face_w, face_h = face
                cv2.rectangle(debug_img, (face_x, face_y), (face_x+face_w, face_y+face_h), (255, 0, 0), 2)
                
                for eye_x, eye_y, eye_w, eye_h in eyes:
                    cv2.rectangle(debug_img, 
                                 (face_x+eye_x, face_y+eye_y), 
                                 (face_x+eye_x+eye_w, face_y+eye_y+eye_h), 
                                 (0, 255, 0), 2)
            
            # Add text with detected direction
            cv2.putText(debug_img, f"Direction: {direction}", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            # Save debug image
            debug_result_path = os.path.join(self.debug_dir, f"result_{timestamp}.jpg")
            cv2.imwrite(debug_result_path, debug_img)
            
            return {
                "gaze_direction": direction,
                "confidence": confidence,
                "timestamp": datetime.now().isoformat(),
                "debug_image": debug_result_path
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            } 