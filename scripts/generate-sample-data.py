#!/usr/bin/env python3
"""
GoREAL Project - Sample Data Generator
Generates realistic sample data for development and testing.
"""

import json
import random
import requests
from datetime import datetime, timedelta
from faker import Faker
import time

# Initialize Faker for generating realistic data
fake = Faker()

# API Configuration
API_BASE_URL = "http://localhost:5000"

# Sample challenge data
CHALLENGES = [
    {"id": "C01", "title": "Clean Your Room", "category": "household"},
    {"id": "C02", "title": "Help with Dishes", "category": "household"},
    {"id": "C03", "title": "Read a Book", "category": "education"},
    {"id": "C04", "title": "Math Practice", "category": "education"},
    {"id": "C05", "title": "Exercise Time", "category": "health"},
    {"id": "C06", "title": "Healthy Meal Prep", "category": "health"},
    {"id": "C07", "title": "Creative Project", "category": "creativity"},
    {"id": "C08", "title": "Help a Neighbor", "category": "community"},
    {"id": "C09", "title": "Learn Something New", "category": "education"},
    {"id": "C10", "title": "Family Time", "category": "social"}
]

# Sample submission texts by category
SUBMISSION_TEXTS = {
    "household": [
        "I cleaned my entire room and organized everything perfectly!",
        "Helped with all the dishes after dinner and dried them too.",
        "Made my bed, vacuumed the floor, and organized my closet.",
        "Cleaned the kitchen counter and put everything away neatly."
    ],
    "education": [
        "Read 3 chapters of my favorite book series today!",
        "Completed 25 math problems and got them all correct.",
        "Studied for 2 hours and learned about the solar system.",
        "Practiced writing and improved my handwriting skills."
    ],
    "health": [
        "Went for a 30-minute run around the neighborhood!",
        "Did yoga exercises and stretching for 45 minutes.",
        "Prepared a healthy smoothie with fruits and vegetables.",
        "Played basketball with friends for an hour."
    ],
    "creativity": [
        "Drew a beautiful landscape painting with watercolors.",
        "Built an amazing castle with my building blocks.",
        "Wrote a short story about adventure and friendship.",
        "Created a collage using magazines and colored paper."
    ],
    "community": [
        "Helped my elderly neighbor carry her groceries.",
        "Volunteered to read to younger kids at the library.",
        "Cleaned up litter in the local park with my family.",
        "Baked cookies and shared them with our neighbors."
    ],
    "social": [
        "Played board games with my whole family for 2 hours.",
        "Had a great conversation with grandparents on video call.",
        "Organized a fun activity for my siblings to enjoy.",
        "Helped my parents plan a family movie night."
    ]
}

def generate_sample_players(count=20):
    """Generate sample player data"""
    players = []
    for i in range(count):
        # Generate kid-friendly usernames
        adjectives = ["Cool", "Smart", "Fast", "Brave", "Kind", "Fun", "Super", "Happy"]
        nouns = ["Tiger", "Dragon", "Star", "Hero", "Explorer", "Artist", "Builder", "Reader"]
        
        player_name = f"{random.choice(adjectives)}_{random.choice(nouns)}_{random.randint(1, 999)}"
        player_id = str(10000 + i)
        
        players.append({
            "player_id": player_id,
            "player_name": player_name,
            "email": fake.email()
        })
    
    return players

def log_challenge_for_player(player_id, player_name, challenge_id):
    """Log a challenge for a player via API"""
    payload = {
        "playerId": player_id,
        "playerName": player_name,
        "challengeId": challenge_id
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/log_challenge",
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        return response.status_code == 200
    except Exception as e:
        print(f"Error logging challenge: {e}")
        return False

def submit_challenge_proof(player_id, challenge_id, submission_text):
    """Submit challenge proof via API"""
    payload = {
        "playerId": player_id,
        "challengeId": challenge_id,
        "submissionText": submission_text
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/submit_challenge",
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        return response.status_code == 200
    except Exception as e:
        print(f"Error submitting challenge: {e}")
        return False

def generate_sample_data(num_players=15, challenges_per_player=5):
    """Generate comprehensive sample data"""
    print("🎮 GoREAL Sample Data Generator")
    print("=" * 40)
    
    # Check if API is available
    try:
        health_response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if health_response.status_code != 200:
            print(f"❌ API not available at {API_BASE_URL}")
            return
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        print("Make sure the API server is running with: docker-compose up -d api")
        return
    
    print(f"✅ API is available at {API_BASE_URL}")
    
    # Generate players
    print(f"\n📊 Generating {num_players} sample players...")
    players = generate_sample_players(num_players)
    
    successful_logs = 0
    successful_submissions = 0
    
    for player in players:
        player_id = player["player_id"]
        player_name = player["player_name"]
        
        print(f"👤 Processing player: {player_name}")
        
        # Generate random challenges for each player
        selected_challenges = random.sample(CHALLENGES, min(challenges_per_player, len(CHALLENGES)))
        
        for challenge in selected_challenges:
            challenge_id = challenge["id"]
            category = challenge["category"]
            
            # Log the challenge
            if log_challenge_for_player(player_id, player_name, challenge_id):
                successful_logs += 1
                print(f"   ✅ Logged challenge: {challenge['title']}")
                
                # Wait a moment for processing
                time.sleep(0.5)
                
                # Randomly decide if player submits proof (70% chance)
                if random.random() < 0.7:
                    submission_text = random.choice(SUBMISSION_TEXTS.get(category, ["Great job completed!"]))
                    
                    if submit_challenge_proof(player_id, challenge_id, submission_text):
                        successful_submissions += 1
                        print(f"   📝 Submitted proof for: {challenge['title']}")
                    else:
                        print(f"   ❌ Failed to submit proof for: {challenge['title']}")
                
                # Small delay between challenges
                time.sleep(0.3)
            else:
                print(f"   ❌ Failed to log challenge: {challenge['title']}")
    
    # Summary
    print("\n" + "=" * 40)
    print("📈 Sample Data Generation Complete!")
    print(f"👥 Players created: {len(players)}")
    print(f"🎯 Challenges logged: {successful_logs}")
    print(f"📝 Proofs submitted: {successful_submissions}")
    print(f"📊 Success rate: {(successful_logs / (len(players) * challenges_per_player)) * 100:.1f}%")
    
    # Save generated data to file
    output_file = f"./data/sample_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "players": players,
            "challenges": CHALLENGES,
            "stats": {
                "players_count": len(players),
                "challenges_logged": successful_logs,
                "proofs_submitted": successful_submissions
            }
        }, f, indent=2)
    
    print(f"💾 Sample data saved to: {output_file}")
    
    print("\n🌐 Next steps:")
    print("• View the dashboard at http://localhost:8501")
    print("• Explore data analysis in Jupyter: http://localhost:8888")
    print("• Run API tests with: scripts/test-api.sh")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate sample data for GoREAL project")
    parser.add_argument("--players", type=int, default=15, help="Number of players to generate")
    parser.add_argument("--challenges", type=int, default=5, help="Average challenges per player")
    
    args = parser.parse_args()
    
    # Create data directory if it doesn't exist
    import os
    os.makedirs("./data", exist_ok=True)
    
    generate_sample_data(args.players, args.challenges)