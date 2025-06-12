from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routes import exam_route, test_route, auth_routes, audio_events, proctoring_events, monitoring
from app.utils.error_handlers import (
    ProctoringException,
    ValidationException,
    proctoring_exception_handler,
    validation_exception_handler,
    general_exception_handler
)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add exception handlers
app.add_exception_handler(ProctoringException, proctoring_exception_handler)
app.add_exception_handler(ValidationException, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(exam_route.router)
app.include_router(test_route.router)
app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
app.include_router(audio_events.router)
app.include_router(proctoring_events.router)
app.include_router(monitoring.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Proctoring API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 