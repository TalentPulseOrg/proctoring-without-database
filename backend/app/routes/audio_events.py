from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from app.models.audio_event import AudioEvent

router = APIRouter()

# In-memory storage for audio events (replace with database in production)
audio_events = []

@router.post("/api/audio-events", response_model=AudioEvent)
async def create_audio_event(event: AudioEvent):
    try:
        # Add timestamp if not provided
        if not event.timestamp:
            event.timestamp = datetime.utcnow()
        
        # Store the event
        audio_events.append(event)
        return event
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/audio-events/{candidate_id}", response_model=List[AudioEvent])
async def get_audio_events(candidate_id: str):
    try:
        # Filter events by candidate_id
        candidate_events = [event for event in audio_events if event.candidate_id == candidate_id]
        return candidate_events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 