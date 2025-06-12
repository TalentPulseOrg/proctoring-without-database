from sqlalchemy.orm import Session
from app.models.audio_event import AudioEvent
from app.schemas.audio_event import AudioEventCreate

class AudioEventService:
    @staticmethod
    def create_audio_event(db: Session, audio_event: AudioEventCreate) -> AudioEvent:
        db_audio_event = AudioEvent(
            candidate_id=audio_event.candidate_id,
            audio_level=audio_event.audio_level,
            event_type=audio_event.event_type
        )
        db.add(db_audio_event)
        db.commit()
        db.refresh(db_audio_event)
        return db_audio_event

    @staticmethod
    def get_candidate_audio_events(db: Session, candidate_id: str, skip: int = 0, limit: int = 100):
        return db.query(AudioEvent)\
            .filter(AudioEvent.candidate_id == candidate_id)\
            .order_by(AudioEvent.timestamp.desc())\
            .offset(skip)\
            .limit(limit)\
            .all() 