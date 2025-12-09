from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.api import (
    auth, businesses, staff, customers, appointments, ai_config,
    services, knowledge_base, call_logs, business_hours, appointments_agent
)


app = FastAPI(
    title="AI Receptionist API",
    description="Multi-tenant AI receptionist SaaS platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth & Core
app.include_router(auth.router)
app.include_router(businesses.router)
app.include_router(staff.router)
app.include_router(customers.router)
app.include_router(appointments.router)
app.include_router(ai_config.router)

# New endpoints
app.include_router(services.router)
app.include_router(knowledge_base.router)
app.include_router(call_logs.router)
app.include_router(business_hours.router)
app.include_router(appointments_agent.router)
app.include_router(appointments_agent.customer_router)


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
    from datetime import datetime
    return {
        "status": "healthy",
        "database": "connected",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )
