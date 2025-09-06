"""
GoREAL Project - Dashboard Components
Reusable UI components for the Streamlit dashboard.
"""

import streamlit as st


def display_playerlog_statistics(df):
    """
    Display key statistics from the player log data including submission statistics.

    Args:
        df: pandas.DataFrame with player log data
    """
    if df is None or df.empty:
        return

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total Challenges", len(df))

    with col2:
        unique_players = df["PlayerID"].nunique() if "PlayerID" in df.columns else 0
        st.metric("Unique Players", unique_players)

    with col3:
        submitted_count = (
            len(df[df["Status"] == "Submitted"]) if "Status" in df.columns else 0
        )
        st.metric("Submitted Proofs", submitted_count)

    with col4:
        completed_count = (
            len(df[df["Status"] == "Completed"]) if "Status" in df.columns else 0
        )
        st.metric("Completed", completed_count)


def display_challenges_statistics(df):
    """
    Display key statistics from the challenges data.

    Args:
        df: pandas.DataFrame with challenges data
    """
    if df is None or df.empty:
        return

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total Challenges", len(df))

    with col2:
        avg_reward = (
            df["RewardPoints"].mean()
            if "RewardPoints" in df.columns and not df.empty
            else 0
        )
        st.metric("Avg Reward Points", f"{avg_reward:.0f}")

    with col3:
        max_reward = (
            df["RewardPoints"].max()
            if "RewardPoints" in df.columns and not df.empty
            else 0
        )
        st.metric("Max Reward Points", max_reward)

    with col4:
        min_reward = (
            df["RewardPoints"].min()
            if "RewardPoints" in df.columns and not df.empty
            else 0
        )
        st.metric("Min Reward Points", min_reward)


def create_playerlog_column_config():
    """
    Create column configuration for the PlayerLog data editor.

    Returns:
        Dictionary with column configuration
    """
    return {
        "Timestamp": st.column_config.TextColumn(
            "Timestamp",
            help="When the challenge was logged",
            disabled=True,
            width="medium",
        ),
        "PlayerID": st.column_config.TextColumn(
            "Player ID", help="Unique player identifier", disabled=True, width="small"
        ),
        "PlayerName": st.column_config.TextColumn(
            "Player Name", help="Player's display name", disabled=True, width="medium"
        ),
        "ChallengeID": st.column_config.TextColumn(
            "Challenge ID", help="Challenge identifier", disabled=True, width="medium"
        ),
        "Status": st.column_config.SelectboxColumn(
            "Status",
            help="Current status of the challenge",
            width="medium",
            options=[
                "Received",
                "In Progress",
                "Submitted",
                "Completed",
                "Failed",
                "Reviewed",
            ],
            required=True,
        ),
        "SubmissionText": st.column_config.TextColumn(
            "Submission Text",
            help="Proof text submitted by the player",
            width="large",
            disabled=False,
        ),
    }


def create_challenges_column_config():
    """
    Create column configuration for the Challenges data editor.

    Returns:
        Dictionary with column configuration
    """
    return {
        "ChallengeID": st.column_config.TextColumn(
            "Challenge ID",
            help="Unique challenge identifier (e.g., C01, C02)",
            width="small",
            required=True,
        ),
        "Title": st.column_config.TextColumn(
            "Title", help="Challenge title/name", width="medium", required=True
        ),
        "Description": st.column_config.TextColumn(
            "Description",
            help="Detailed challenge description",
            width="large",
            required=True,
        ),
        "RewardPoints": st.column_config.NumberColumn(
            "Reward Points",
            help="Points awarded for completing this challenge",
            width="small",
            min_value=0,
            max_value=10000,
            step=1,
            required=True,
        ),
    }


def display_submission_reviews(df):
    """
    Display submissions that require admin review.

    Args:
        df: pandas.DataFrame with player log data
    """
    if "SubmissionText" not in df.columns:
        return

    submitted_entries = df[
        (df["Status"] == "Submitted")
        & (df["SubmissionText"].notna())
        & (df["SubmissionText"] != "")
    ]

    if not submitted_entries.empty:
        st.markdown("---")
        st.subheader("🔍 Recent Submissions Requiring Review")
        for idx, row in submitted_entries.iterrows():
            with st.expander(
                f"📝 {row['PlayerName']} - {row['ChallengeID']} ({row['Timestamp']})"
            ):
                st.write("**Submission:**")
                st.write(f"_{row['SubmissionText']}_")
                st.write(f"**Player:** {row['PlayerName']} (ID: {row['PlayerID']})")
                st.write(f"**Challenge:** {row['ChallengeID']}")


def create_filter_controls(df, prefix=""):
    """
    Create filter controls for data tables.

    Args:
        df: pandas.DataFrame to create filters for
        prefix: Prefix for filter keys to avoid conflicts

    Returns:
        Dictionary with selected filter values
    """
    filters = {}

    if "PlayerName" in df.columns:
        filters["players"] = st.multiselect(
            "Filter by Player",
            options=df["PlayerName"].unique(),
            default=[],
            key=f"{prefix}_player_filter",
        )

    if "ChallengeID" in df.columns:
        filters["challenges"] = st.multiselect(
            "Filter by Challenge",
            options=df["ChallengeID"].unique(),
            default=[],
            key=f"{prefix}_challenge_filter",
        )

    if "Status" in df.columns:
        status_options = df["Status"].unique().tolist()
        filters["statuses"] = st.multiselect(
            "Filter by Status",
            options=status_options,
            default=[],
            key=f"{prefix}_status_filter",
        )

    return filters


def apply_filters(df, filters):
    """
    Apply filters to a dataframe.

    Args:
        df: pandas.DataFrame to filter
        filters: Dictionary of filter values

    Returns:
        Filtered pandas.DataFrame
    """
    filtered_df = df.copy()

    if filters.get("players"):
        filtered_df = filtered_df[filtered_df["PlayerName"].isin(filters["players"])]

    if filters.get("challenges"):
        filtered_df = filtered_df[
            filtered_df["ChallengeID"].isin(filters["challenges"])
        ]

    if filters.get("statuses"):
        filtered_df = filtered_df[filtered_df["Status"].isin(filters["statuses"])]

    return filtered_df
