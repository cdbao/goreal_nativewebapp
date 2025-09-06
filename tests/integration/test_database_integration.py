"""
GoREAL Project - Database Integration Tests
Tests for database operations and data integrity.
"""

import pytest
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from goreal.core.database import (
    Player, Challenge, PlayerChallenge, ActivityLog, Achievement, PlayerAchievement
)


@pytest.mark.integration
@pytest.mark.database
class TestPlayerModel:
    """Integration tests for Player model."""
    
    def test_create_player(self, test_session):
        """Test creating a new player."""
        player = Player(
            player_id="TEST123",
            player_name="TestPlayer",
            email="test@example.com",
            total_points=100
        )
        
        test_session.add(player)
        test_session.commit()
        
        # Verify player was created
        retrieved_player = test_session.query(Player).filter_by(player_id="TEST123").first()
        assert retrieved_player is not None
        assert retrieved_player.player_name == "TestPlayer"
        assert retrieved_player.email == "test@example.com"
        assert retrieved_player.total_points == 100
        assert retrieved_player.is_active is True
    
    def test_player_unique_constraint(self, test_session):
        """Test that player_id must be unique."""
        player1 = Player(player_id="TEST123", player_name="Player1")
        player2 = Player(player_id="TEST123", player_name="Player2")
        
        test_session.add(player1)
        test_session.commit()
        
        test_session.add(player2)
        with pytest.raises(IntegrityError):
            test_session.commit()
    
    def test_player_relationships(self, test_session):
        """Test player relationships with challenges and achievements."""
        # Create player
        player = Player(player_id="TEST123", player_name="TestPlayer")
        test_session.add(player)
        
        # Create challenge
        challenge = Challenge(
            challenge_id="C01",
            title="Test Challenge",
            description="Test Description",
            reward_points=100
        )
        test_session.add(challenge)
        
        # Create player challenge
        player_challenge = PlayerChallenge(
            player_id="TEST123",
            challenge_id="C01",
            status="completed"
        )
        test_session.add(player_challenge)
        
        test_session.commit()
        
        # Test relationships
        retrieved_player = test_session.query(Player).filter_by(player_id="TEST123").first()
        assert len(retrieved_player.challenges) == 1
        assert retrieved_player.challenges[0].challenge_id == "C01"


@pytest.mark.integration
@pytest.mark.database
class TestChallengeModel:
    """Integration tests for Challenge model."""
    
    def test_create_challenge(self, test_session):
        """Test creating a new challenge."""
        challenge = Challenge(
            challenge_id="C01",
            title="Test Challenge",
            description="This is a test challenge",
            reward_points=150,
            difficulty_level="medium",
            category="test"
        )
        
        test_session.add(challenge)
        test_session.commit()
        
        # Verify challenge was created
        retrieved_challenge = test_session.query(Challenge).filter_by(challenge_id="C01").first()
        assert retrieved_challenge is not None
        assert retrieved_challenge.title == "Test Challenge"
        assert retrieved_challenge.reward_points == 150
        assert retrieved_challenge.difficulty_level == "medium"
        assert retrieved_challenge.category == "test"
        assert retrieved_challenge.is_active is True
    
    def test_challenge_unique_constraint(self, test_session):
        """Test that challenge_id must be unique."""
        challenge1 = Challenge(challenge_id="C01", title="Challenge 1", description="Desc 1", reward_points=100)
        challenge2 = Challenge(challenge_id="C01", title="Challenge 2", description="Desc 2", reward_points=200)
        
        test_session.add(challenge1)
        test_session.commit()
        
        test_session.add(challenge2)
        with pytest.raises(IntegrityError):
            test_session.commit()


@pytest.mark.integration
@pytest.mark.database
class TestPlayerChallengeModel:
    """Integration tests for PlayerChallenge model."""
    
    def test_create_player_challenge(self, test_session):
        """Test creating a new player challenge."""
        # Create prerequisites
        player = Player(player_id="TEST123", player_name="TestPlayer")
        challenge = Challenge(challenge_id="C01", title="Test Challenge", description="Desc", reward_points=100)
        test_session.add_all([player, challenge])
        test_session.commit()
        
        # Create player challenge
        player_challenge = PlayerChallenge(
            player_id="TEST123",
            challenge_id="C01",
            status="in_progress",
            submission_text="Working on it...",
            points_awarded=0
        )
        
        test_session.add(player_challenge)
        test_session.commit()
        
        # Verify player challenge was created
        retrieved_pc = test_session.query(PlayerChallenge).filter_by(
            player_id="TEST123", challenge_id="C01"
        ).first()
        assert retrieved_pc is not None
        assert retrieved_pc.status == "in_progress"
        assert retrieved_pc.submission_text == "Working on it..."
        assert retrieved_pc.points_awarded == 0
    
    def test_player_challenge_unique_constraint(self, test_session):
        """Test that player can only have one attempt per challenge."""
        # Create prerequisites
        player = Player(player_id="TEST123", player_name="TestPlayer")
        challenge = Challenge(challenge_id="C01", title="Test Challenge", description="Desc", reward_points=100)
        test_session.add_all([player, challenge])
        test_session.commit()
        
        # Create first player challenge
        pc1 = PlayerChallenge(player_id="TEST123", challenge_id="C01")
        test_session.add(pc1)
        test_session.commit()
        
        # Try to create duplicate
        pc2 = PlayerChallenge(player_id="TEST123", challenge_id="C01")
        test_session.add(pc2)
        with pytest.raises(IntegrityError):
            test_session.commit()
    
    def test_player_challenge_foreign_keys(self, test_session):
        """Test foreign key constraints."""
        # Try to create player challenge without player
        pc_no_player = PlayerChallenge(player_id="NONEXISTENT", challenge_id="C01")
        test_session.add(pc_no_player)
        with pytest.raises(IntegrityError):
            test_session.commit()
        
        test_session.rollback()
        
        # Try to create player challenge without challenge
        player = Player(player_id="TEST123", player_name="TestPlayer")
        test_session.add(player)
        test_session.commit()
        
        pc_no_challenge = PlayerChallenge(player_id="TEST123", challenge_id="NONEXISTENT")
        test_session.add(pc_no_challenge)
        with pytest.raises(IntegrityError):
            test_session.commit()


@pytest.mark.integration
@pytest.mark.database
class TestActivityLogModel:
    """Integration tests for ActivityLog model."""
    
    def test_create_activity_log(self, test_session):
        """Test creating activity log entries."""
        log_entry = ActivityLog(
            player_id="TEST123",
            challenge_id="C01",
            action="challenge_received",
            details={"source": "roblox_game", "session_id": "sess_123"},
            ip_address="192.168.1.1"
        )
        
        test_session.add(log_entry)
        test_session.commit()
        
        # Verify log entry was created
        retrieved_log = test_session.query(ActivityLog).filter_by(
            player_id="TEST123", action="challenge_received"
        ).first()
        assert retrieved_log is not None
        assert retrieved_log.challenge_id == "C01"
        assert retrieved_log.details["source"] == "roblox_game"
        assert retrieved_log.ip_address == "192.168.1.1"
    
    def test_activity_log_json_details(self, test_session):
        """Test JSON storage in activity log details."""
        complex_details = {
            "user_agent": "RobloxApp/1.0",
            "platform": "windows",
            "game_data": {
                "level": 5,
                "score": 1250,
                "items": ["sword", "shield", "potion"]
            },
            "metrics": {
                "time_spent": 300.5,
                "attempts": 3
            }
        }
        
        log_entry = ActivityLog(
            player_id="TEST123",
            action="challenge_completed",
            details=complex_details
        )
        
        test_session.add(log_entry)
        test_session.commit()
        
        # Verify JSON data integrity
        retrieved_log = test_session.query(ActivityLog).filter_by(
            player_id="TEST123", action="challenge_completed"
        ).first()
        assert retrieved_log.details["user_agent"] == "RobloxApp/1.0"
        assert retrieved_log.details["game_data"]["level"] == 5
        assert retrieved_log.details["metrics"]["time_spent"] == 300.5


@pytest.mark.integration
@pytest.mark.database
class TestAchievementSystem:
    """Integration tests for achievement system."""
    
    def test_create_achievement(self, test_session):
        """Test creating an achievement."""
        achievement = Achievement(
            achievement_id="ACH001",
            title="First Steps",
            description="Complete your first challenge",
            points_required=1,
            icon_url="https://example.com/icon1.png"
        )
        
        test_session.add(achievement)
        test_session.commit()
        
        # Verify achievement was created
        retrieved_achievement = test_session.query(Achievement).filter_by(
            achievement_id="ACH001"
        ).first()
        assert retrieved_achievement is not None
        assert retrieved_achievement.title == "First Steps"
        assert retrieved_achievement.points_required == 1
    
    def test_player_achievement_earning(self, test_session):
        """Test player earning an achievement."""
        # Create prerequisites
        player = Player(player_id="TEST123", player_name="TestPlayer")
        achievement = Achievement(
            achievement_id="ACH001",
            title="First Steps",
            description="Complete your first challenge",
            points_required=1
        )
        test_session.add_all([player, achievement])
        test_session.commit()
        
        # Award achievement to player
        player_achievement = PlayerAchievement(
            player_id="TEST123",
            achievement_id="ACH001"
        )
        
        test_session.add(player_achievement)
        test_session.commit()
        
        # Verify achievement was awarded
        retrieved_pa = test_session.query(PlayerAchievement).filter_by(
            player_id="TEST123", achievement_id="ACH001"
        ).first()
        assert retrieved_pa is not None
        assert retrieved_pa.earned_at is not None
        
        # Test relationship
        retrieved_player = test_session.query(Player).filter_by(player_id="TEST123").first()
        assert len(retrieved_player.achievements) == 1
        assert retrieved_player.achievements[0].achievement_id == "ACH001"


@pytest.mark.integration
@pytest.mark.database
@pytest.mark.slow
class TestDataIntegrity:
    """Tests for data integrity and complex queries."""
    
    def test_cascade_delete_player(self, test_session):
        """Test that deleting a player cascades to related records."""
        # Create player with related data
        player = Player(player_id="TEST123", player_name="TestPlayer")
        challenge = Challenge(challenge_id="C01", title="Test", description="Desc", reward_points=100)
        player_challenge = PlayerChallenge(player_id="TEST123", challenge_id="C01")
        achievement = Achievement(achievement_id="ACH001", title="Test Achievement", description="Desc")
        player_achievement = PlayerAchievement(player_id="TEST123", achievement_id="ACH001")
        
        test_session.add_all([player, challenge, player_challenge, achievement, player_achievement])
        test_session.commit()
        
        # Verify data exists
        assert test_session.query(PlayerChallenge).filter_by(player_id="TEST123").count() == 1
        assert test_session.query(PlayerAchievement).filter_by(player_id="TEST123").count() == 1
        
        # Delete player
        test_session.delete(player)
        test_session.commit()
        
        # Verify cascaded deletes
        assert test_session.query(PlayerChallenge).filter_by(player_id="TEST123").count() == 0
        assert test_session.query(PlayerAchievement).filter_by(player_id="TEST123").count() == 0
        
        # Challenge and Achievement should still exist
        assert test_session.query(Challenge).filter_by(challenge_id="C01").count() == 1
        assert test_session.query(Achievement).filter_by(achievement_id="ACH001").count() == 1
    
    def test_complex_query_player_stats(self, test_session):
        """Test complex query for player statistics."""
        # Create test data
        player = Player(player_id="TEST123", player_name="TestPlayer")
        
        challenges = [
            Challenge(challenge_id="C01", title="Challenge 1", description="Desc 1", reward_points=100),
            Challenge(challenge_id="C02", title="Challenge 2", description="Desc 2", reward_points=150),
            Challenge(challenge_id="C03", title="Challenge 3", description="Desc 3", reward_points=200),
        ]
        
        player_challenges = [
            PlayerChallenge(player_id="TEST123", challenge_id="C01", status="completed", points_awarded=100),
            PlayerChallenge(player_id="TEST123", challenge_id="C02", status="submitted", points_awarded=0),
            PlayerChallenge(player_id="TEST123", challenge_id="C03", status="received", points_awarded=0),
        ]
        
        test_session.add(player)
        test_session.add_all(challenges)
        test_session.add_all(player_challenges)
        test_session.commit()
        
        # Complex query for player statistics
        from sqlalchemy import func
        
        stats = test_session.query(
            func.count(PlayerChallenge.id).label('total_challenges'),
            func.sum(func.case([(PlayerChallenge.status == 'completed', 1)], else_=0)).label('completed_challenges'),
            func.sum(PlayerChallenge.points_awarded).label('total_points'),
            func.avg(Challenge.reward_points).label('avg_challenge_value')
        ).join(Challenge).filter(PlayerChallenge.player_id == "TEST123").first()
        
        assert stats.total_challenges == 3
        assert stats.completed_challenges == 1
        assert stats.total_points == 100
        assert abs(stats.avg_challenge_value - 150) < 0.01  # Average of 100, 150, 200
    
    def test_timestamp_functionality(self, test_session):
        """Test automatic timestamp management."""
        # Create player
        player = Player(player_id="TEST123", player_name="TestPlayer")
        test_session.add(player)
        test_session.commit()
        
        created_at = player.created_at
        updated_at = player.updated_at
        
        assert created_at is not None
        assert updated_at is not None
        
        # Update player
        import time
        time.sleep(0.1)  # Small delay to ensure timestamp difference
        
        player.total_points = 100
        test_session.commit()
        
        # Check that updated_at changed but created_at didn't
        assert player.created_at == created_at
        assert player.updated_at > updated_at