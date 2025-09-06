"""
Tests for the validators module.
"""

import pytest
from goreal.core.validators import (
    validate_challenge_data,
    validate_submission_data,
    validate_status_query,
)


class TestValidateChallengeData:
    """Tests for validate_challenge_data function."""

    def test_valid_data(self):
        """Test with valid challenge data."""
        data = {"playerId": 12345, "playerName": "test_player", "challengeId": "C01"}
        is_valid, error = validate_challenge_data(data)
        assert is_valid is True
        assert error == ""

    def test_empty_data(self):
        """Test with empty data."""
        is_valid, error = validate_challenge_data(None)
        assert is_valid is False
        assert error == "No JSON data provided"

    def test_missing_field(self):
        """Test with missing required field."""
        data = {
            "playerId": 12345,
            "playerName": "test_player"
            # Missing challengeId
        }
        is_valid, error = validate_challenge_data(data)
        assert is_valid is False
        assert "Missing required field: challengeId" in error

    def test_empty_field_value(self):
        """Test with empty field value."""
        data = {
            "playerId": 12345,
            "playerName": "",  # Empty value
            "challengeId": "C01",
        }
        is_valid, error = validate_challenge_data(data)
        assert is_valid is False
        assert "Empty value for field: playerName" in error


class TestValidateSubmissionData:
    """Tests for validate_submission_data function."""

    def test_valid_submission(self):
        """Test with valid submission data."""
        data = {
            "playerId": 12345,
            "challengeId": "C01",
            "submissionText": "I completed the challenge!",
        }
        is_valid, error = validate_submission_data(data)
        assert is_valid is True
        assert error == ""

    def test_missing_submission_text(self):
        """Test with missing submission text."""
        data = {
            "playerId": 12345,
            "challengeId": "C01"
            # Missing submissionText
        }
        is_valid, error = validate_submission_data(data)
        assert is_valid is False
        assert "Missing required field: submissionText" in error


class TestValidateStatusQuery:
    """Tests for validate_status_query function."""

    def test_valid_query(self):
        """Test with valid status query parameters."""
        is_valid, error = validate_status_query("12345", "C01")
        assert is_valid is True
        assert error == ""

    def test_missing_player_id(self):
        """Test with missing player ID."""
        is_valid, error = validate_status_query(None, "C01")
        assert is_valid is False
        assert error == "Missing required parameter: playerId"

    def test_missing_challenge_id(self):
        """Test with missing challenge ID."""
        is_valid, error = validate_status_query("12345", None)
        assert is_valid is False
        assert error == "Missing required parameter: challengeId"
