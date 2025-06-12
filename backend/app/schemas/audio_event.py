from datetime import datetime
from pydantic import BaseModel

class AudioEventBase(BaseModel):
    candidate_id: str
    audio_level: float
    event_type: str

class AudioEventCreate(AudioEventBase):
    pass

class AudioEvent(AudioEventBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True 