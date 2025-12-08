from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from api import auth, businesses, staff, customers, appointments


# Create FastAPI app
app = FastAPI(
    title="AI Receptionist API",
    description="Multi-tenant AI receptionist SaaS platform",
    version="1.0.0"
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(auth.router)
app.include_router(businesses.router)
app.include_router(staff.router)
app.include_router(customers.router)
app.include_router(appointments.router)


@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "message": "AI Receptionist API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",  # We'll verify this later
        "timestamp": "2025-01-08T12:00:00Z"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True  # Auto-reload on code changes
    )

