import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.database import init_db
from api.auth import router as auth_router
from api.predictions import router as predictions_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("student_predictor")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down application...")

app = FastAPI(
    title="Student Performance Predictor API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(predictions_router)

# Health check endpoint
@app.get("/api/v1/health", tags=["health"])
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

# Mount frontend static files
# Make sure this is mounted last to allow router endpoints to match first
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")