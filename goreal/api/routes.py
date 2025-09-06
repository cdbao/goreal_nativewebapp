"""
GoREAL Project - API Routes
Flask API routes for handling Roblox game requests.
"""

from flask import Flask, request, jsonify
from ..core.sheets_client import GoogleSheetsClient
from ..core.validators import (
    validate_challenge_data,
    validate_submission_data,
    validate_status_query,
)
from ..config.settings import SHEET_NAME, CREDENTIALS_FILE
import os


# Initialize Google Sheets client
sheets_client = GoogleSheetsClient(CREDENTIALS_FILE, SHEET_NAME)


def create_api_routes(app: Flask):
    """
    Create all API routes for the Flask application.

    Args:
        app: Flask application instance
    """

    @app.route("/log_challenge", methods=["POST"])
    def log_challenge():
        """
        API endpoint to receive challenge data from Roblox and log to Google Sheets PlayerLog.
        Expected JSON format: {"playerId": 12345, "playerName": "some_user", "challengeId": "C01"}
        """
        try:
            # Parse incoming JSON data
            data = request.get_json()

            # Validate the request data
            is_valid, error_message = validate_challenge_data(data)
            if not is_valid:
                return jsonify({"status": "error", "message": error_message}), 400

            # Extract data from request
            player_id = data["playerId"]
            player_name = data["playerName"]
            challenge_id = data["challengeId"]

            # Log the challenge
            success = sheets_client.log_challenge(player_id, player_name, challenge_id)

            if success:
                return (
                    jsonify(
                        {"status": "success", "message": "Data logged successfully"}
                    ),
                    200,
                )
            else:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Failed to log data to Google Sheets",
                        }
                    ),
                    500,
                )

        except Exception as e:
            return (
                jsonify(
                    {"status": "error", "message": f"Internal server error: {str(e)}"}
                ),
                500,
            )

    @app.route("/submit_challenge", methods=["POST"])
    def submit_challenge():
        """
        API endpoint to receive proof submission from players.
        Expected JSON format: {"playerId": 12345678, "challengeId": "C01", "submissionText": "Proof text"}
        """
        try:
            # Parse incoming JSON data
            data = request.get_json()

            # Validate the submission data
            is_valid, error_message = validate_submission_data(data)
            if not is_valid:
                return jsonify({"status": "error", "message": error_message}), 400

            # Extract data from request
            player_id = data["playerId"]
            challenge_id = data["challengeId"]
            submission_text = data["submissionText"]

            # Update the submission
            success = sheets_client.update_submission(
                player_id, challenge_id, submission_text
            )

            if success:
                return (
                    jsonify({"status": "success", "message": "Submission received."}),
                    200,
                )
            else:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": f"No matching challenge log found for playerId {player_id} and challengeId {challenge_id}",
                        }
                    ),
                    404,
                )

        except Exception as e:
            return (
                jsonify(
                    {"status": "error", "message": f"Internal server error: {str(e)}"}
                ),
                500,
            )

    @app.route("/get_status", methods=["GET"])
    def get_status():
        """
        API endpoint to query the status of a player's challenge from PlayerLog sheet.
        Expected query parameters: playerId and challengeId
        Example: /get_status?playerId=1234567&challengeId=C01_Test
        """
        try:
            # Get query parameters
            player_id = request.args.get("playerId")
            challenge_id = request.args.get("challengeId")

            # Validate query parameters
            is_valid, error_message = validate_status_query(player_id, challenge_id)
            if not is_valid:
                return jsonify({"status": "error", "message": error_message}), 400

            # Get player status
            status_data = sheets_client.get_player_status(player_id, challenge_id)

            if status_data:
                return (
                    jsonify(
                        {
                            "status": "Found",
                            "challengeStatus": status_data["status"],
                            "timestamp": status_data["timestamp"],
                            "playerName": status_data["playerName"],
                            "submissionText": status_data["submissionText"],
                        }
                    ),
                    200,
                )
            else:
                return jsonify({"status": "NotFound", "challengeStatus": None}), 404

        except Exception as e:
            return (
                jsonify(
                    {"status": "error", "message": f"Internal server error: {str(e)}"}
                ),
                500,
            )

    @app.route("/get_challenges", methods=["GET"])
    def get_challenges():
        """
        API endpoint to retrieve the list of available challenges from Challenges sheet.
        Returns all challenges as a JSON array.
        Example: GET /get_challenges
        """
        try:
            challenges = sheets_client.get_challenges()

            return (
                jsonify(
                    {
                        "status": "success",
                        "message": f"Retrieved {len(challenges)} challenges successfully",
                        "challenges": challenges,
                    }
                ),
                200,
            )

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Internal server error: {str(e)}",
                        "challenges": [],
                    }
                ),
                500,
            )

    @app.route("/health", methods=["GET"])
    def health_check():
        """
        Simple health check endpoint to verify API is running.
        """
        return (
            jsonify(
                {
                    "status": "healthy",
                    "message": "GoREAL API is running",
                    "endpoints": {
                        "POST /log_challenge": "Log player challenge submissions",
                        "POST /submit_challenge": "Submit proof of challenge completion",
                        "GET /get_status": "Query player challenge status",
                        "GET /get_challenges": "Retrieve available challenges list",
                        "GET /health": "Health check",
                    },
                }
            ),
            200,
        )
