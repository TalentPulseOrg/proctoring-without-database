from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import auth, face_verification, monitoring, test, audio_events, proctoring_events, gaze_routes

app = FastAPI(title="Proctoring API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(face_verification.router, prefix="/face-verification", tags=["face-verification"])
app.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
app.include_router(test.router, prefix="/test", tags=["test"])
app.include_router(audio_events.router, prefix="/api", tags=["audio-events"])
app.include_router(proctoring_events.router)  # No prefix needed as it's included in the router
app.include_router(gaze_routes.router)  # Include gaze tracking router

@app.get("/")
async def root():
    return {"message": "Proctoring API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}