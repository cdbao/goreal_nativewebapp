"""
GoREAL Project - Google Sheets Client
Handles all Google Sheets operations for the GoREAL project.
"""

import gspread
import logging
from google.oauth2.service_account import Credentials
from typing import Optional, Tuple, List, Dict, Any
from datetime import datetime
import os


class GoogleSheetsClient:
    """
    Client for managing Google Sheets operations for the GoREAL project.
    """

    def __init__(self, credentials_file: str, sheet_name: str):
        """
        Initialize the Google Sheets client.

        Args:
            credentials_file: Path to the Google service account credentials JSON file
            sheet_name: Name of the Google Sheet to connect to
        """
        self.credentials_file = credentials_file
        self.sheet_name = sheet_name
        self.playerlog_sheet = "PlayerLog"
        self.challenges_sheet = "Challenges"
        self.logger = logging.getLogger(__name__)

        # Google Sheets API scopes
        self.scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive",
        ]

        self._sheet = None
        self._gc = None

    def connect(self) -> Tuple[Optional[Any], Optional[Any]]:
        """
        Establishes connection to Google Sheets using service account credentials.

        Returns:
            Tuple of (sheet_object, gspread_client) or (None, None) if connection fails
        """
        try:
            if not os.path.exists(self.credentials_file):
                raise FileNotFoundError(
                    f"Credentials file not found: {self.credentials_file}"
                )

            # Load credentials from JSON file
            credentials = Credentials.from_service_account_file(
                self.credentials_file, scopes=self.scope
            )

            # Initialize the gspread client
            self._gc = gspread.authorize(credentials)

            # Open the specific Google Sheet
            self._sheet = self._gc.open(self.sheet_name)

            return self._sheet, self._gc

        except FileNotFoundError as e:
            self.logger.error(f"Credentials file not found: {e}")
            return None, None
        except Exception as e:
            self.logger.error(
                f"Error connecting to Google Sheets: {str(e)}", exc_info=True
            )
            return None, None

    def get_worksheet(self, worksheet_name: str):
        """
        Get a specific worksheet from the connected sheet.

        Args:
            worksheet_name: Name of the worksheet to retrieve

        Returns:
            Worksheet object or None if not found
        """
        if not self._sheet:
            self._sheet, self._gc = self.connect()
            if not self._sheet:
                return None

        try:
            return self._sheet.worksheet(worksheet_name)
        except Exception as e:
            self.logger.error(
                f"Error accessing worksheet '{worksheet_name}': {str(e)}", exc_info=True
            )
            return None

    def log_challenge(
        self,
        player_id: str,
        player_name: str,
        challenge_id: str,
        status: str = "Received",
        submission_text: str = "",
    ) -> bool:
        """
        Log a challenge submission to the PlayerLog sheet.

        Args:
            player_id: Unique player identifier
            player_name: Player's display name
            challenge_id: Challenge identifier
            status: Current status of the challenge
            submission_text: Optional submission text

        Returns:
            True if successful, False otherwise
        """
        try:
            worksheet = self.get_worksheet(self.playerlog_sheet)
            if not worksheet:
                return False

            # Generate current timestamp
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Prepare row data: Timestamp, PlayerID, PlayerName, ChallengeID, Status, SubmissionText
            row_data = [
                timestamp,
                str(player_id),
                str(player_name),
                str(challenge_id),
                status,
                submission_text,
            ]

            # Append the new row to the Google Sheet
            worksheet.append_row(row_data)
            return True

        except Exception as e:
            self.logger.error(
                f"Error logging challenge for player {player_id}, challenge {challenge_id}: {str(e)}",
                exc_info=True,
            )
            return False

    def update_submission(
        self,
        player_id: str,
        challenge_id: str,
        submission_text: str,
        status: str = "Submitted",
    ) -> bool:
        """
        Update a challenge submission with proof text.

        Args:
            player_id: Player identifier
            challenge_id: Challenge identifier
            submission_text: Proof text submitted by player
            status: New status to set

        Returns:
            True if successful, False otherwise
        """
        try:
            worksheet = self.get_worksheet(self.playerlog_sheet)
            if not worksheet:
                return False

            # Fetch all records to find the matching entry
            records = worksheet.get_all_records()
            if not records:
                return False

            # Search from bottom to top for most recent matching entry
            matching_row_index = None
            for idx in range(len(records) - 1, -1, -1):
                record = records[idx]
                if str(record.get("PlayerID", "")) == str(player_id) and str(
                    record.get("ChallengeID", "")
                ) == str(challenge_id):
                    matching_row_index = idx + 2  # +2 for 1-indexed rows and headers
                    break

            if matching_row_index is None:
                return False

            # Update Status (column 5) and SubmissionText (column 6)
            worksheet.update_cell(matching_row_index, 5, status)
            worksheet.update_cell(matching_row_index, 6, submission_text)

            return True

        except Exception as e:
            self.logger.error(
                f"Error updating submission for player {player_id}, challenge {challenge_id}: {str(e)}",
                exc_info=True,
            )
            return False

    def get_player_status(
        self, player_id: str, challenge_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get the status of a player's challenge.

        Args:
            player_id: Player identifier
            challenge_id: Challenge identifier

        Returns:
            Dictionary with status information or None if not found
        """
        try:
            worksheet = self.get_worksheet(self.playerlog_sheet)
            if not worksheet:
                return None

            records = worksheet.get_all_records()
            if not records:
                return None

            # Search for most recent matching record
            for record in reversed(records):
                if str(record.get("PlayerID", "")) == str(player_id) and str(
                    record.get("ChallengeID", "")
                ) == str(challenge_id):
                    return {
                        "status": record.get("Status", "Unknown"),
                        "timestamp": record.get("Timestamp", ""),
                        "playerName": record.get("PlayerName", ""),
                        "submissionText": record.get("SubmissionText", ""),
                    }

            return None

        except Exception as e:
            self.logger.error(
                f"Error getting player status for player {player_id}, challenge {challenge_id}: {str(e)}",
                exc_info=True,
            )
            return None

    def get_challenges(self) -> List[Dict[str, Any]]:
        """
        Get all available challenges from the Challenges sheet.

        Returns:
            List of challenge dictionaries
        """
        try:
            worksheet = self.get_worksheet(self.challenges_sheet)
            if not worksheet:
                return []

            records = worksheet.get_all_records()
            return records if records else []

        except Exception as e:
            self.logger.error(f"Error getting challenges: {str(e)}", exc_info=True)
            return []
