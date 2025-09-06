"""
GoREAL Project - Streamlit Dashboard Application
Multi-tab dashboard for managing player logs and dynamic challenges with proof submission system.
"""

import streamlit as st
import time
from datetime import datetime
import os

from .data_handlers import (
    fetch_playerlog_data,
    fetch_challenges_data,
    save_playerlog_changes,
    save_challenges_changes,
)
from .components import (
    display_playerlog_statistics,
    display_challenges_statistics,
    create_playerlog_column_config,
    create_challenges_column_config,
    display_submission_reviews,
    create_filter_controls,
    apply_filters,
)
from ..config.settings import (
    SHEET_NAME,
    CREDENTIALS_FILE,
    PLAYERLOG_SHEET,
    CHALLENGES_SHEET,
)


def configure_page():
    """Configure Streamlit page settings."""
    st.set_page_config(
        page_title="GoREAL Project - Admin Dashboard",
        page_icon="🎮",
        layout="wide",
        initial_sidebar_state="expanded",
    )


def create_sidebar():
    """Create the dashboard sidebar with information and controls."""
    with st.sidebar:
        st.header("Dashboard Info")
        st.info(
            "Multi-tab dashboard for managing player logs and challenges with proof submission system"
        )

        # Display last update time
        last_update = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        st.write(f"**Last Update:** {last_update}")

        # Manual refresh button
        if st.button("🔄 Refresh All Data"):
            st.cache_data.clear()
            st.rerun()

        st.markdown("---")
        st.subheader("Sheet Configuration")
        st.write(f"**Database:** {SHEET_NAME}")
        st.write(f"**PlayerLog Sheet:** {PLAYERLOG_SHEET}")
        st.write(f"**Challenges Sheet:** {CHALLENGES_SHEET}")

        st.markdown("---")
        st.subheader("Tab Information")
        st.write(
            "**Player Activity Log:** View and edit player challenge submissions with proof text"
        )
        st.write("**Challenge Management:** Add, edit, or delete available challenges")

        st.markdown("---")
        st.subheader("Submission Workflow")
        st.write("1. Player completes challenge")
        st.write("2. Player submits proof via game")
        st.write("3. Admin reviews submission text")
        st.write("4. Admin changes status to 'Completed'")


def player_activity_tab():
    """Content for the Player Activity Log tab with proof submission support."""
    st.header("📋 Player Activity Log")

    # Fetch data from PlayerLog sheet
    with st.spinner("Loading player log data from Google Sheets..."):
        df = fetch_playerlog_data()

    if df is None:
        st.error(
            "Failed to load player log data from Google Sheets. Please check your connection and credentials."
        )
        return

    # Display statistics
    st.subheader("📊 Player Activity Statistics")
    display_playerlog_statistics(df)
    st.markdown("---")

    if df.empty:
        st.info(
            "No player activity data available yet. Waiting for data from Roblox game..."
        )
    else:
        # Display data with filters
        col1, col2 = st.columns([3, 1])

        with col2:
            # Filter options
            filters = create_filter_controls(df, "playerlog")

        # Apply filters
        filtered_df = apply_filters(df, filters)

        # Interactive data editor with SubmissionText support
        st.subheader("🔧 Edit Player Activity Data")
        st.info(
            "💡 You can edit the data below. Review SubmissionText to verify player proofs and update Status accordingly."
        )

        # Configure column types for the data editor
        column_config = create_playerlog_column_config()

        # Use data_editor for interactivity
        edited_df = st.data_editor(
            filtered_df,
            column_config=column_config,
            use_container_width=True,
            height=400,
            key="playerlog_data_editor",
        )

        # Save Changes button logic
        col1, col2, col3 = st.columns([1, 1, 2])
        with col1:
            if st.button("💾 Save Log Changes", type="primary"):
                with st.spinner("Saving changes to PlayerLog sheet..."):
                    success, message = save_playerlog_changes(edited_df)

                if success:
                    st.success(f"✅ {message}")
                    st.cache_data.clear()
                    time.sleep(2)
                    st.rerun()
                else:
                    st.error(f"❌ {message}")

        with col2:
            if st.button("🔄 Reset Log Changes"):
                st.cache_data.clear()
                st.rerun()

        # Display submission highlights for admin review
        display_submission_reviews(edited_df)


def challenge_management_tab():
    """Content for the Challenge Management tab."""
    st.header("🏆 Challenge Management")

    # Fetch data from Challenges sheet
    with st.spinner("Loading challenges data from Google Sheets..."):
        df = fetch_challenges_data()

    if df is None:
        st.error(
            "Failed to load challenges data from Google Sheets. Please check your connection and credentials."
        )
        return

    # Display statistics
    st.subheader("📊 Challenge Statistics")
    display_challenges_statistics(df)
    st.markdown("---")

    # Interactive challenge editor
    st.subheader("🔧 Manage Dynamic Challenges")
    st.info(
        "💡 You can add, edit, or delete challenges below. Use the 'Save Challenge List' button to apply all changes."
    )

    # Configure column types for the challenges data editor
    column_config = create_challenges_column_config()

    # Use data_editor for challenge management with ability to add/delete rows
    edited_challenges_df = st.data_editor(
        df,
        column_config=column_config,
        use_container_width=True,
        height=400,
        num_rows="dynamic",  # Allow adding and deleting rows
        key="challenges_data_editor",
    )

    # Save Challenge List button
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        if st.button("💾 Save Challenge List", type="primary"):
            with st.spinner("Saving challenge list to Google Sheets..."):
                success, message = save_challenges_changes(edited_challenges_df)

            if success:
                st.success(f"✅ {message}")
                st.cache_data.clear()
                time.sleep(2)
                st.rerun()
            else:
                st.error(f"❌ {message}")

    with col2:
        if st.button("🔄 Reset Challenge Changes"):
            st.cache_data.clear()
            st.rerun()

    # Display current challenges as reference
    if not edited_challenges_df.empty:
        st.subheader("📝 Current Challenge List Preview")
        st.dataframe(edited_challenges_df, use_container_width=True)


def main():
    """Main function to run the Streamlit dashboard."""
    # Configure page
    configure_page()

    # Dashboard header
    st.title("🎮 GoREAL Project - Admin Dashboard")
    st.markdown(
        "*Dynamic Challenge System with Proof Submission - Multi-Tab Interface*"
    )
    st.markdown("---")

    # Check if credentials file exists
    if not os.path.exists(CREDENTIALS_FILE):
        st.error(
            f"⚠️ {CREDENTIALS_FILE} not found. Please upload your Google Service Account credentials."
        )
        st.stop()

    # Create sidebar
    create_sidebar()

    # Create multi-tab interface
    tab1, tab2 = st.tabs(["Player Activity Log", "Challenge Management"])

    with tab1:
        player_activity_tab()

    with tab2:
        challenge_management_tab()


if __name__ == "__main__":
    main()
