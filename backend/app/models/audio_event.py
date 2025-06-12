from datetime import datetime
from pydantic import BaseModel

class AudioEvent(BaseModel):
    timestamp: datetime
    level: float
    type: str
    candidate_id: str | None = None

    class Config:
        from_attributes = True

    def __repr__(self):
        return f"<AudioEvent(timestamp={self.timestamp}, level={self.level}, type={self.type}, candidate_id={self.candidate_id})>" 