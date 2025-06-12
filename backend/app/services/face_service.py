import cv2
import numpy as np
import face_recognition
from PIL import Image
import io
from typing import Tuple

class FaceService:
    def compare_faces(self, id_photo: bytes, live_photo: bytes) -> Tuple[bool, float]:
        """Compare ID photo with live photo"""
        try:
            # Convert bytes to numpy arrays
            id_image = face_recognition.load_image_file(io.BytesIO(id_photo))
            live_image = face_recognition.load_image_file(io.BytesIO(live_photo))

            # Get face encodings
            id_encoding = face_recognition.face_encodings(id_image)
            live_encoding = face_recognition.face_encodings(live_image)

            if not id_encoding or not live_encoding:
                return False, 0.0

            # Compare faces
            face_distance = face_recognition.face_distance([id_encoding[0]], live_encoding[0])[0]
            match_score = 1 - face_distance
            is_match = match_score >= 0.7  # 70% threshold

            return is_match, match_score
        except Exception as e:
            print(f"Error comparing faces: {e}")
            return False, 0.0 