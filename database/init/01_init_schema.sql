-- GoREAL Project - Database Schema Initialization
-- This script creates the initial database schema for the GoREAL project

-- Create database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table to store player information
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) UNIQUE NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    total_points INTEGER DEFAULT 0
);

-- Challenges table to store challenge definitions
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    challenge_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    reward_points INTEGER NOT NULL DEFAULT 0,
    difficulty_level VARCHAR(20) DEFAULT 'easy',
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Player challenges table to track individual challenge attempts
CREATE TABLE IF NOT EXISTS player_challenges (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL,
    challenge_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'received',
    submission_text TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id) ON DELETE CASCADE,
    UNIQUE(player_id, challenge_id)
);

-- Activity logs table for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50),
    challenge_id VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- Achievements table for player achievements
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    achievement_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(500),
    points_required INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Player achievements table to track earned achievements
CREATE TABLE IF NOT EXISTS player_achievements (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL,
    achievement_id VARCHAR(50) NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    UNIQUE(player_id, achievement_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenge_id ON challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_player_challenges_player_id ON player_challenges(player_id);
CREATE INDEX IF NOT EXISTS idx_player_challenges_challenge_id ON player_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_player_challenges_status ON player_challenges(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_player_id ON activity_logs(player_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_challenges_updated_at BEFORE UPDATE ON player_challenges 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO goreal_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO goreal_user;