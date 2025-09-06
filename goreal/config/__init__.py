"""
GoREAL Project - Configuration Module
Centralized configuration settings for the GoREAL project.
"""

from .settings import (
    SHEET_NAME,
    CREDENTIALS_FILE,
    PLAYERLOG_SHEET,
    CHALLENGES_SHEET,
    API_HOST,
    API_PORT,
    DEBUG_MODE,
    DASHBOARD_PORT,
    CACHE_TTL,
    DATA_DIR,
    LOGS_DIR
)

__all__ = [
    'SHEET_NAME',
    'CREDENTIALS_FILE',
    'PLAYERLOG_SHEET', 
    'CHALLENGES_SHEET',
    'API_HOST',
    'API_PORT',
    'DEBUG_MODE',
    'DASHBOARD_PORT',
    'CACHE_TTL',
    'DATA_DIR',
    'LOGS_DIR'
]