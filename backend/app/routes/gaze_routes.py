from fastapi import APIRouter, UploadFile, File, HTTPException
from datetime import datetime
import os
from ..utils.gaze_tracking import analyze_gaze
from ..utils.logging import log_event

router = APIRouter(tags=["gaze"])

@router.post("/analyze")
async def analyze_gaze_route(image: UploadFile = File(...)):
    try:
        snapshots_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'snapshots')
        os.makedirs(snapshots_dir, exist_ok=True)
        
        image_path = os.path.join(snapshots_dir, f"gaze_{datetime.now().timestamp()}.jpg")
        
        # Save the uploaded file
        with open(image_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
        
        gaze_result = analyze_gaze(image_path)
        
        if gaze_result.get('status') == 'success':
            log_event('gaze_analysis', gaze_result)
        
        return gaze_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 