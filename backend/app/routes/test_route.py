from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
import re
from dotenv import load_dotenv
from datetime import datetime
import uuid
import logging
import cv2
import numpy as np
import face_recognition

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api/tests", tags=["tests"])

# Get API key from environment variable
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')

class TestRequest(BaseModel):
    skill: str
    num_questions: int
    duration: int

class TestResult(BaseModel):
    score: int
    total: int
    timestamp: str
    skill: str

@router.post("/generate")
async def generate_test(request: TestRequest):
    try:
        prompt = f"""You are a test generator. Generate {request.num_questions} multiple choice questions about {request.skill}.
Return ONLY a valid JSON object in this exact format, with no additional text or explanation:
{{
  "questions": [
    {{
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A"
    }}
  ]
}}

Requirements:
1. Return ONLY the JSON object, no other text
2. Each question must have exactly 4 options
3. The correct_answer must exactly match one of the options
4. Make sure the JSON is properly formatted with no trailing commas
5. Use proper JSON escaping for special characters
6. Each option should be a complete sentence or phrase
7. Questions should be challenging but fair
8. Options should be plausible and well-distributed"""
        
        response = model.generate_content(prompt)
        test_data = parse_gemini_response(response.text)
        
        # Generate a unique test ID
        test_id = str(uuid.uuid4())
        
        # Add test ID to the response
        test_data['testId'] = test_id
        
        return test_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

def parse_gemini_response(response_text):
    try:
        # Clean up the response text
        json_str = response_text.strip()
        
        # Remove any markdown code block indicators
        json_str = re.sub(r'```json\s*', '', json_str)
        json_str = re.sub(r'```\s*$', '', json_str)
        
        # Remove any leading/trailing non-JSON text
        json_str = re.sub(r'^[^{]*', '', json_str)
        json_str = re.sub(r'[^}]*$', '', json_str)
        
        # Try to parse the JSON
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            # If parsing fails, try to fix common JSON issues
            json_str = re.sub(r',\s*}', '}', json_str)  # Remove trailing commas
            json_str = re.sub(r',\s*]', ']', json_str)  # Remove trailing commas in arrays
            data = json.loads(json_str)
        
        # Validate response structure
        if not isinstance(data.get('questions'), list):
            raise ValueError("Invalid questions format")
            
        for question in data['questions']:
            if not all(key in question for key in ['question', 'options', 'correct_answer']):
                raise ValueError("Missing required question fields")
            if len(question['options']) != 4:
                raise ValueError("Each question must have exactly 4 options")
            if question['correct_answer'] not in question['options']:
                raise ValueError("Correct answer must match one of the options")
                
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"AI Response Parsing Failed: {str(e)}"
        )

@router.post("/submit")
async def submit_test(result: TestResult):
    try:
        # Here you would typically save the result to a database
        # For now, we'll just return a success response
        return {
            "message": "Test result saved successfully",
            "result": {
                "score": result.score,
                "total": result.total,
                "percentage": (result.score / result.total) * 100,
                "timestamp": result.timestamp,
                "skill": result.skill
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-snapshot")
async def save_snapshot(
    image: UploadFile = File(...),
    test_id: str = Form(...)
):
    """
    Save a webcam snapshot and detect faces
    """
    try:
        logger.info(f"Received snapshot for test {test_id}")
        
        # Read the uploaded file
        contents = await image.read()
        logger.info(f"Read {len(contents)} bytes from uploaded file")
        
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file received")

        # Convert image bytes to numpy array for face detection
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert BGR to RGB (face_recognition uses RGB)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        face_locations = face_recognition.face_locations(rgb_img)
        face_count = len(face_locations)
        
        logger.info(f"Detected {face_count} faces in the image")

        # Create base directories
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        snapshots_dir = os.path.join(base_dir, "snapshots", test_id)
        suspicious_dir = os.path.join(base_dir, "suspicious_snapshots", test_id)
        
        # Create directories if they don't exist
        os.makedirs(snapshots_dir, exist_ok=True)
        os.makedirs(suspicious_dir, exist_ok=True)
        
        # Generate timestamp for filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"snapshot_{timestamp}.jpg"
        
        # Determine which directory to save to based on face count
        if face_count > 1:
            file_path = os.path.join(suspicious_dir, filename)
            logger.warning(f"Multiple faces detected ({face_count}). Saving to suspicious directory.")
        else:
            file_path = os.path.join(snapshots_dir, filename)
            logger.info("Single face detected. Saving to regular snapshots directory.")
        
        # Save the file
        with open(file_path, "wb") as f:
            f.write(contents)
        logger.info(f"Successfully saved snapshot to {file_path}")
        
        return {
            "status": "success",
            "message": "Snapshot saved successfully",
            "path": file_path,
            "face_count": face_count,
            "is_suspicious": face_count > 1
        }
        
    except Exception as e:
        logger.error(f"Error saving snapshot: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))