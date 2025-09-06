-- GoREAL Project - Sample Data
-- This script inserts sample data for development and testing

-- Insert sample challenges
INSERT INTO challenges (challenge_id, title, description, reward_points, difficulty_level, category) VALUES
('C01', 'Clean Your Room', 'Organize and clean your bedroom, making sure everything is tidy and in its proper place.', 100, 'easy', 'household'),
('C02', 'Help with Dishes', 'Assist with washing, drying, or putting away dishes after a meal.', 75, 'easy', 'household'),
('C03', 'Read a Book', 'Read at least 30 pages of an age-appropriate book and be ready to discuss it.', 150, 'medium', 'education'),
('C04', 'Math Practice', 'Complete 20 math problems correctly in your grade level.', 200, 'medium', 'education'),
('C05', 'Exercise Time', 'Do at least 30 minutes of physical activity like running, playing sports, or dancing.', 125, 'easy', 'health'),
('C06', 'Healthy Meal Prep', 'Help prepare a healthy snack or meal for yourself or family.', 175, 'medium', 'health'),
('C07', 'Creative Project', 'Create something artistic like drawing, painting, writing a story, or building something.', 250, 'hard', 'creativity'),
('C08', 'Help a Neighbor', 'Do something kind for a neighbor like helping carry groceries or walking their dog.', 300, 'hard', 'community'),
('C09', 'Learn Something New', 'Learn a new skill or hobby and practice it for at least 1 hour.', 200, 'medium', 'education'),
('C10', 'Family Time', 'Spend quality time with family members playing games, talking, or doing activities together.', 100, 'easy', 'social');

-- Insert sample players
INSERT INTO players (player_id, player_name, email, total_points) VALUES
('12345', 'Alex_Gamer', 'alex@example.com', 450),
('23456', 'Maya_Explorer', 'maya@example.com', 650),
('34567', 'Sam_Builder', 'sam@example.com', 325),
('45678', 'Jordan_Artist', 'jordan@example.com', 800),
('56789', 'Casey_Reader', 'casey@example.com', 275),
('67890', 'Riley_Athlete', 'riley@example.com', 550),
('78901', 'Avery_Helper', 'avery@example.com', 725),
('89012', 'Drew_Scholar', 'drew@example.com', 900),
('90123', 'Blake_Creator', 'blake@example.com', 375),
('01234', 'Quinn_Leader', 'quinn@example.com', 625);

-- Insert sample player challenges with various statuses
INSERT INTO player_challenges (player_id, challenge_id, status, submission_text, submitted_at, completed_at, points_awarded) VALUES
-- Completed challenges
('12345', 'C01', 'completed', 'I cleaned my room completely! Made my bed, organized my desk, and put all clothes away.', 
 CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days', 100),
('12345', 'C02', 'completed', 'Helped mom with all the dinner dishes. Washed, dried, and put everything away.', 
 CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', 75),

-- Submitted challenges (awaiting review)
('23456', 'C03', 'submitted', 'I read 3 chapters of Harry Potter today (about 45 pages). The story is getting really exciting!', 
 CURRENT_TIMESTAMP - INTERVAL '3 hours', NULL, 0),
('34567', 'C01', 'submitted', 'Cleaned my entire room and even vacuumed! Everything looks perfect now.', 
 CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL, 0),
('45678', 'C07', 'submitted', 'I painted a beautiful landscape of our backyard. Used watercolors and spent 2 hours on it.', 
 CURRENT_TIMESTAMP - INTERVAL '4 hours', NULL, 0),

-- In progress challenges
('56789', 'C04', 'in_progress', NULL, NULL, NULL, 0),
('67890', 'C05', 'in_progress', NULL, NULL, NULL, 0),

-- Recently received challenges
('78901', 'C06', 'received', NULL, NULL, NULL, 0),
('89012', 'C09', 'received', NULL, NULL, NULL, 0),
('90123', 'C08', 'received', NULL, NULL, NULL, 0),

-- More completed challenges for variety
('23456', 'C05', 'completed', 'Went for a 45-minute bike ride around the neighborhood. Great exercise!', 
 CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days', 125),
('45678', 'C02', 'completed', 'Helped with dishes every day this week! Parents were very happy.', 
 CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days', 75),
('67890', 'C01', 'completed', 'Room is spotless! Organized all my books and games too.', 
 CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days', 100),
('89012', 'C03', 'completed', 'Read the entire first book of Percy Jackson series. Amazing adventure story!', 
 CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days', 150);

-- Insert sample achievements
INSERT INTO achievements (achievement_id, title, description, points_required) VALUES
('ACH001', 'First Steps', 'Complete your first challenge', 1),
('ACH002', 'Clean Master', 'Complete 5 household challenges', 500),
('ACH003', 'Bookworm', 'Complete 3 reading challenges', 300),
('ACH004', 'Helping Hand', 'Complete 10 challenges total', 1000),
('ACH005', 'Super Student', 'Complete 5 education challenges', 750),
('ACH006', 'Health Hero', 'Complete 3 health challenges', 400),
('ACH007', 'Creative Genius', 'Complete 3 creativity challenges', 600),
('ACH008', 'Community Champion', 'Complete 2 community challenges', 500);

-- Insert sample player achievements
INSERT INTO player_achievements (player_id, achievement_id, earned_at) VALUES
('12345', 'ACH001', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('23456', 'ACH001', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('45678', 'ACH001', CURRENT_TIMESTAMP - INTERVAL '4 days'),
('67890', 'ACH001', CURRENT_TIMESTAMP - INTERVAL '5 days'),
('89012', 'ACH001', CURRENT_TIMESTAMP - INTERVAL '6 days'),
('89012', 'ACH003', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Insert sample activity logs
INSERT INTO activity_logs (player_id, challenge_id, action, details, timestamp) VALUES
('12345', 'C01', 'challenge_received', '{"source": "roblox_game", "session_id": "sess_123"}', CURRENT_TIMESTAMP - INTERVAL '2 days 2 hours'),
('12345', 'C01', 'challenge_submitted', '{"submission_method": "game_interface"}', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('12345', 'C01', 'challenge_completed', '{"reviewed_by": "admin", "points_awarded": 100}', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('23456', 'C03', 'challenge_received', '{"source": "roblox_game", "session_id": "sess_456"}', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('23456', 'C03', 'challenge_submitted', '{"submission_method": "game_interface"}', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
('34567', 'C01', 'challenge_received', '{"source": "roblox_game", "session_id": "sess_789"}', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
('34567', 'C01', 'challenge_submitted', '{"submission_method": "game_interface"}', CURRENT_TIMESTAMP - INTERVAL '1 hour');