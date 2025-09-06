"""
GoREAL Project - Dashboard Data Handlers
Data fetching and processing functions for the Streamlit dashboard.
"""

import streamlit as st
import pandas as pd
from ..core.sheets_client import GoogleSheetsClient
from ..config.settings import SHEET_NAME, CREDENTIALS_FILE


@st.cache_resource
def get_sheets_client():
    """
    Get a cached Google Sheets client instance.
    
    Returns:
        GoogleSheetsClient instance
    """
    return GoogleSheetsClient(CREDENTIALS_FILE, SHEET_NAME)


@st.cache_data(ttl=60)
def fetch_playerlog_data():
    """
    Fetches all data from the PlayerLog sheet including the SubmissionText column.
    Cached for 60 seconds to provide auto-refresh functionality.
    
    Returns:
        pandas.DataFrame with player log data or None if error
    """
    try:
        client = get_sheets_client()
        sheet, gc = client.connect()
        if not sheet:
            return None
        
        # Get the PlayerLog worksheet
        worksheet = client.get_worksheet(client.playerlog_sheet)
        if not worksheet:
            return None
        
        # Get all records from the sheet
        records = worksheet.get_all_records()
        
        # Convert to pandas DataFrame
        if records:
            df = pd.DataFrame(records)
            return df
        else:
            # Return empty DataFrame with correct columns
            return pd.DataFrame(columns=[
                'Timestamp', 'PlayerID', 'PlayerName', 
                'ChallengeID', 'Status', 'SubmissionText'
            ])
            
    except Exception as e:
        st.error(f"Error fetching PlayerLog data: {str(e)}")
        return None


@st.cache_data(ttl=60)
def fetch_challenges_data():
    """
    Fetches all data from the Challenges sheet.
    Cached for 60 seconds to provide auto-refresh functionality.
    
    Returns:
        pandas.DataFrame with challenges data or None if error
    """
    try:
        client = get_sheets_client()
        sheet, gc = client.connect()
        if not sheet:
            return None
        
        # Get the Challenges worksheet
        worksheet = client.get_worksheet(client.challenges_sheet)
        if not worksheet:
            return None
        
        # Get all records from the sheet
        records = worksheet.get_all_records()
        
        # Convert to pandas DataFrame
        if records:
            df = pd.DataFrame(records)
            return df
        else:
            # Return empty DataFrame with correct columns
            return pd.DataFrame(columns=[
                'ChallengeID', 'Title', 'Description', 'RewardPoints'
            ])
            
    except Exception as e:
        st.error(f"Error fetching Challenges data: {str(e)}")
        return None


def save_playerlog_changes(edited_df):
    """
    Save the entire player log dataframe to Google Sheets.
    
    Args:
        edited_df: pandas.DataFrame with edited data
        
    Returns:
        Tuple of (success, message)
    """
    try:
        client = get_sheets_client()
        sheet, gc = client.connect()
        if not sheet:
            return False, "Failed to connect to Google Sheets"
        
        # Get the PlayerLog worksheet
        worksheet = client.get_worksheet(client.playerlog_sheet)
        if not worksheet:
            return False, "Failed to access PlayerLog sheet"
        
        # Clear all existing content
        worksheet.clear()
        
        # Prepare data with headers
        if not edited_df.empty:
            # Convert DataFrame to list of lists with headers
            headers = list(edited_df.columns)
            data = [headers] + edited_df.values.tolist()
            
            # Write the entire edited DataFrame back
            worksheet.update(data)
            
            return True, f"Player Log updated successfully! {len(edited_df)} records saved."
        else:
            # If DataFrame is empty, just add headers
            headers = ['Timestamp', 'PlayerID', 'PlayerName', 'ChallengeID', 'Status', 'SubmissionText']
            worksheet.update([headers])
            
            return True, "Player Log cleared and headers restored."
            
    except Exception as e:
        return False, f"Error saving Player Log: {str(e)}"


def save_challenges_changes(edited_df):
    """
    Save the entire challenges dataframe to Google Sheets.
    
    Args:
        edited_df: pandas.DataFrame with edited data
        
    Returns:
        Tuple of (success, message)
    """
    try:
        client = get_sheets_client()
        sheet, gc = client.connect()
        if not sheet:
            return False, "Failed to connect to Google Sheets"
        
        worksheet = client.get_worksheet(client.challenges_sheet)
        if not worksheet:
            return False, "Failed to access Challenges sheet"
        
        # Clear the entire sheet
        worksheet.clear()
        
        # Prepare data with headers
        if not edited_df.empty:
            # Convert DataFrame to list of lists with headers
            headers = list(edited_df.columns)
            data = [headers] + edited_df.values.tolist()
            
            # Update the sheet with all data
            worksheet.update(data)
        else:
            # If DataFrame is empty, just add headers
            headers = ['ChallengeID', 'Title', 'Description', 'RewardPoints']
            worksheet.update([headers])
        
        return True, "Challenge list saved successfully"
            
    except Exception as e:
        return False, f"Error saving Challenge list: {str(e)}"