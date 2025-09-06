"""
GoREAL Project - API Endpoints Tests
Comprehensive tests for all API endpoints.
"""

import json
import pytest
from unittest.mock import patch
from flask import Flask


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_check_success(self, client):
        """Test health check returns 200 and correct response."""
        response = client.get("/health")

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "healthy"
        assert data["message"] == "GoREAL API is running"
        assert "endpoints" in data


class TestLogChallengeEndpoint:
    """Tests for the log challenge endpoint."""

    @patch("goreal.api.routes.sheets_client.log_challenge")
    def test_log_challenge_success(
        self, mock_log_challenge, client, sample_player_data
    ):
        """Test successful challenge logging."""
        mock_log_challenge.return_value = True

        response = client.post(
            "/log_challenge",
            data=json.dumps(sample_player_data),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "success"
        assert "Data logged successfully" in data["message"]

        # Verify the mock was called with correct parameters
        mock_log_challenge.assert_called_once_with(
            sample_player_data["playerId"],
            sample_player_data["playerName"],
            sample_player_data["challengeId"],
        )

    def test_log_challenge_missing_player_id(self, client):
        """Test log challenge with missing playerId."""
        invalid_data = {"playerName": "TestPlayer", "challengeId": "C01"}

        response = client.post(
            "/log_challenge",
            data=json.dumps(invalid_data),
            content_type="application/json",
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["status"] == "error"
        assert "Missing required field: playerId" in data["message"]

    def test_log_challenge_empty_player_name(self, client):
        """Test log challenge with empty playerName."""
        invalid_data = {"playerId": "TEST123", "playerName": "", "challengeId": "C01"}

        response = client.post(
            "/log_challenge",
            data=json.dumps(invalid_data),
            content_type="application/json",
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["status"] == "error"
        assert "Empty value for field: playerName" in data["message"]

    def test_log_challenge_no_json_data(self, client):
        """Test log challenge with no JSON data."""
        response = client.post("/log_challenge")

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["status"] == "error"
        assert "No JSON data provided" in data["message"]

    @patch("goreal.api.routes.sheets_client.log_challenge")
    def test_log_challenge_sheets_failure(
        self, mock_log_challenge, client, sample_player_data
    ):
        """Test challenge logging when Google Sheets operation fails."""
        mock_log_challenge.return_value = False

        response = client.post(
            "/log_challenge",
            data=json.dumps(sample_player_data),
            content_type="application/json",
        )

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data["status"] == "error"
        assert "Failed to log data to Google Sheets" in data["message"]


class TestSubmitChallengeEndpoint:
    """Tests for the submit challenge endpoint."""

    @patch("goreal.api.routes.sheets_client.update_submission")
    def test_submit_challenge_success(
        self, mock_update_submission, client, sample_submission_data
    ):
        """Test successful challenge submission."""
        mock_update_submission.return_value = True

        response = client.post(
            "/submit_challenge",
            data=json.dumps(sample_submission_data),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "success"
        assert "Submission received" in data["message"]

        # Verify the mock was called with correct parameters
        mock_update_submission.assert_called_once_with(
            sample_submission_data["playerId"],
            sample_submission_data["challengeId"],
            sample_submission_data["submissionText"],
        )

    def test_submit_challenge_missing_submission_text(self, client):
        """Test submit challenge with missing submissionText."""
        invalid_data = {"playerId": "TEST123", "challengeId": "C01"}

        response = client.post(
            "/submit_challenge",
            data=json.dumps(invalid_data),
            content_type="application/json",
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["status"] == "error"
        assert "Missing required field: submissionText" in data["message"]

    @patch("goreal.api.routes.sheets_client.update_submission")
    def test_submit_challenge_not_found(
        self, mock_update_submission, client, sample_submission_data
    ):
        """Test submit challenge when no matching challenge log is found."""
        mock_update_submission.return_value = False

        response = client.post(
            "/submit_challenge",
            data=json.dumps(sample_submission_data),
            content_type="application/json",
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data["status"] == "error"
        assert "No matching challenge log found" in data["message"]


class TestGetStatusEndpoint:
    """Tests for the get status endpoint."""

    @patch("goreal.api.routes.sheets_client.get_player_status")
    def test_get_status_found(self, mock_get_player_status, client):
        """Test get status when player challenge is found."""
        mock_status_data = {
            "status": "completed",
            "timestamp": "2023-01-01 12:00:00",
            "playerName": "TestPlayer",
            "submissionText": "Test submission",
        }
        mock_get_player_status.return_value = mock_status_data

        response = client.get("/get_status?playerId=TEST123&challengeId=C01")

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "Found"
        assert data["challengeStatus"] == "completed"
        assert data["timestamp"] == "2023-01-01 12:00:00"
        assert data["playerName"] == "TestPlayer"
        assert data["submissionText"] == "Test submission"

    @patch("goreal.api.routes.sheets_client.get_player_status")
    def test_get_status_not_found(self, mock_get_player_status, client):
        """Test get status when player challenge is not found."""
        mock_get_player_status.return_value = None

        response = client.get("/get_status?playerId=NONEXISTENT&challengeId=C99")

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data["status"] == "NotFound"
        assert data["challengeStatus"] is None

    def test_get_status_missing_player_id(self, client):
        """Test get status with missing playerId parameter."""
        response = client.get("/get_status?challengeId=C01")

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["status"] == "error"
        assert "Missing required parameter: playerId" in data["message"]

    def test_get_status_missing_challenge_id(self, client):
        """Test get status with missing challengeId parameter."""
        response = client.get("/get_status?playerId=TEST123")

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["status"] == "error"
        assert "Missing required parameter: challengeId" in data["message"]


class TestGetChallengesEndpoint:
    """Tests for the get challenges endpoint."""

    @patch("goreal.api.routes.sheets_client.get_challenges")
    def test_get_challenges_success(self, mock_get_challenges, client):
        """Test successful challenges retrieval."""
        mock_challenges = [
            {
                "ChallengeID": "C01",
                "Title": "Test Challenge 1",
                "Description": "Test Description 1",
                "RewardPoints": 100,
            },
            {
                "ChallengeID": "C02",
                "Title": "Test Challenge 2",
                "Description": "Test Description 2",
                "RewardPoints": 200,
            },
        ]
        mock_get_challenges.return_value = mock_challenges

        response = client.get("/get_challenges")

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "success"
        assert "Retrieved 2 challenges successfully" in data["message"]
        assert len(data["challenges"]) == 2
        assert data["challenges"][0]["ChallengeID"] == "C01"
        assert data["challenges"][1]["ChallengeID"] == "C02"

    @patch("goreal.api.routes.sheets_client.get_challenges")
    def test_get_challenges_empty(self, mock_get_challenges, client):
        """Test challenges retrieval when no challenges exist."""
        mock_get_challenges.return_value = []

        response = client.get("/get_challenges")

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "success"
        assert "Retrieved 0 challenges successfully" in data["message"]
        assert data["challenges"] == []


class TestErrorHandling:
    """Tests for general error handling."""

    @patch("goreal.api.routes.sheets_client.log_challenge")
    def test_internal_server_error(
        self, mock_log_challenge, client, sample_player_data
    ):
        """Test internal server error handling."""
        mock_log_challenge.side_effect = Exception("Database connection error")

        response = client.post(
            "/log_challenge",
            data=json.dumps(sample_player_data),
            content_type="application/json",
        )

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data["status"] == "error"
        assert "Internal server error" in data["message"]

    def test_invalid_json_format(self, client):
        """Test handling of invalid JSON format."""
        response = client.post(
            "/log_challenge", data='{"invalid": json}', content_type="application/json"
        )

        assert response.status_code == 400

    def test_unsupported_media_type(self, client):
        """Test handling of unsupported media type."""
        response = client.post(
            "/log_challenge",
            data="playerId=TEST123&playerName=Test&challengeId=C01",
            content_type="application/x-www-form-urlencoded",
        )

        # The endpoint should still process form data, but validation will fail
        assert response.status_code == 400


@pytest.mark.integration
class TestEndToEndFlow:
    """Integration tests for complete API workflows."""

    @patch("goreal.api.routes.sheets_client")
    def test_complete_challenge_flow(self, mock_sheets_client, client):
        """Test complete challenge flow: log → submit → check status."""
        # Configure mocks for successful flow
        mock_sheets_client.log_challenge.return_value = True
        mock_sheets_client.update_submission.return_value = True
        mock_sheets_client.get_player_status.return_value = {
            "status": "submitted",
            "timestamp": "2023-01-01 12:00:00",
            "playerName": "TestPlayer",
            "submissionText": "Challenge completed successfully!",
        }

        player_data = {
            "playerId": "TEST123",
            "playerName": "TestPlayer",
            "challengeId": "C01",
        }

        # Step 1: Log challenge
        response = client.post(
            "/log_challenge",
            data=json.dumps(player_data),
            content_type="application/json",
        )
        assert response.status_code == 200

        # Step 2: Submit proof
        submission_data = {
            "playerId": "TEST123",
            "challengeId": "C01",
            "submissionText": "Challenge completed successfully!",
        }

        response = client.post(
            "/submit_challenge",
            data=json.dumps(submission_data),
            content_type="application/json",
        )
        assert response.status_code == 200

        # Step 3: Check status
        response = client.get("/get_status?playerId=TEST123&challengeId=C01")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "Found"
        assert data["challengeStatus"] == "submitted"
        assert "Challenge completed successfully!" in data["submissionText"]
