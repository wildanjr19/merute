import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api.health import router as health_router
from app.api.routes import router as routes_router
from app.api.ai import router as ai_router
from app.api.planner import router as planner_router

load_dotenv()

app = FastAPI(
    title="MeRute API",
    description="Backend API untuk MeRute - Running Route Builder",
    version="1.0.0"
)

# CORS configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router)
app.include_router(routes_router)
app.include_router(ai_router)
app.include_router(planner_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MeRute API",
        "version": "1.0.0",
        "docs": "/docs"
    }
