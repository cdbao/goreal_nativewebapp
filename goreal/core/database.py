"""
GoREAL Project - Database Connection and Models
SQLAlchemy models and database connection management.
"""

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional
import os

# Database URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://goreal_user:goreal_password@localhost:5432/goreal_db"
)

# Create database engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Player(Base):
    """Player model for storing player information."""

    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String(50), unique=True, nullable=False, index=True)
    player_name = Column(String(100), nullable=False)
    email = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    total_points = Column(Integer, default=0)

    # Relationships
    challenges = relationship("PlayerChallenge", back_populates="player")
    achievements = relationship("PlayerAchievement", back_populates="player")


class Challenge(Base):
    """Challenge model for storing challenge definitions."""

    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    reward_points = Column(Integer, nullable=False, default=0)
    difficulty_level = Column(String(20), default="easy")
    category = Column(String(50), default="general")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    player_challenges = relationship("PlayerChallenge", back_populates="challenge")


class PlayerChallenge(Base):
    """Player challenge model for tracking individual challenge attempts."""

    __tablename__ = "player_challenges"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String(50), ForeignKey("players.player_id"), nullable=False)
    challenge_id = Column(
        String(50), ForeignKey("challenges.challenge_id"), nullable=False
    )
    status = Column(String(20), default="received")
    submission_text = Column(Text)
    submitted_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    points_awarded = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    player = relationship("Player", back_populates="challenges")
    challenge = relationship("Challenge", back_populates="player_challenges")


class ActivityLog(Base):
    """Activity log model for audit trail."""

    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String(50))
    challenge_id = Column(String(50))
    action = Column(String(50), nullable=False)
    details = Column(JSON)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45))


class Achievement(Base):
    """Achievement model for storing achievement definitions."""

    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    icon_url = Column(String(500))
    points_required = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    player_achievements = relationship(
        "PlayerAchievement", back_populates="achievement"
    )


class PlayerAchievement(Base):
    """Player achievement model for tracking earned achievements."""

    __tablename__ = "player_achievements"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String(50), ForeignKey("players.player_id"), nullable=False)
    achievement_id = Column(
        String(50), ForeignKey("achievements.achievement_id"), nullable=False
    )
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    player = relationship("Player", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="player_achievements")


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables in the database."""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all tables in the database."""
    Base.metadata.drop_all(bind=engine)
