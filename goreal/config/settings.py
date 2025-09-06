"""
GoREAL Project - Configuration Settings
Centralized configuration for the GoREAL project.
"""

import os
from pathlib import Path
from typing import Optional

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent

class Config:
    """Base configuration class."""
    
    # Google Sheets configuration
    SHEET_NAME: str = os.getenv("SHEET_NAME", "GoReal_Database")
    CREDENTIALS_FILE: str = os.getenv(
        "GOOGLE_CREDENTIALS_FILE", 
        os.path.join(PROJECT_ROOT, "goreal-470006-ac9c0ea86e0c.json")
    )
    PLAYERLOG_SHEET: str = os.getenv("PLAYERLOG_SHEET", "PlayerLog")
    CHALLENGES_SHEET: str = os.getenv("CHALLENGES_SHEET", "Challenges")
    
    # API configuration
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "5000"))
    DEBUG_MODE: bool = os.getenv("DEBUG_MODE", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-key-change-in-production")
    
    # Dashboard configuration
    DASHBOARD_PORT: int = int(os.getenv("DASHBOARD_PORT", "8501"))
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "60"))  # seconds

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG_MODE = True

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG_MODE = False
    
    def __init__(self):
        # Ensure required environment variables are set in production
        required_vars = ["SECRET_KEY", "GOOGLE_CREDENTIALS_FILE"]
        for var in required_vars:
            if not os.getenv(var):
                raise ValueError(f"Required environment variable {var} is not set")

class TestingConfig(Config):
    """Testing configuration."""
    DEBUG_MODE = True
    CACHE_TTL = 0  # Disable caching in tests

def get_config() -> Config:
    """Get configuration based on environment."""
    env = os.getenv("FLASK_ENV", "development").lower()
    
    if env == "production":
        return ProductionConfig()
    elif env == "testing":
        return TestingConfig()
    else:
        return DevelopmentConfig()

# Current configuration instance
config = get_config()

# Backward compatibility - expose as module-level variables
SHEET_NAME = config.SHEET_NAME
CREDENTIALS_FILE = config.CREDENTIALS_FILE
PLAYERLOG_SHEET = config.PLAYERLOG_SHEET
CHALLENGES_SHEET = config.CHALLENGES_SHEET
API_HOST = config.API_HOST
API_PORT = config.API_PORT
DEBUG_MODE = config.DEBUG_MODE
DASHBOARD_PORT = config.DASHBOARD_PORT
CACHE_TTL = config.CACHE_TTL

# Data directories
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
LOGS_DIR = os.path.join(PROJECT_ROOT, "logs")

# Create directories if they don't exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)