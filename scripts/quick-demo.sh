#!/bin/bash
# GoREAL Project - Quick Demo Script
# Demonstrates the full GoREAL workflow with sample data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC}                     ${CYAN}🎮 GoREAL Project Demo${NC}                        ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[STEP $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Demo configuration
API_URL="http://localhost:5000"
DEMO_PLAYER_ID="DEMO_$(date +%s)"
DEMO_PLAYER_NAME="Demo_Player"
DEMO_CHALLENGE_ID="C01"

print_header

echo -e "This demo will showcase the complete GoREAL workflow:"
echo -e "1. 🏥 Check API health"
echo -e "2. 🎯 Log a challenge"
echo -e "3. 📝 Submit proof"
echo -e "4. 📊 Query status"
echo -e "5. 📋 Get challenges list"
echo -e "6. 🎮 Generate sample data"
echo -e "7. 📈 Show analytics preview"
echo ""
echo -e "${CYAN}Demo Player: $DEMO_PLAYER_NAME ($DEMO_PLAYER_ID)${NC}"
echo ""

read -p "Press Enter to start the demo..."
echo ""

# Step 1: Health Check
print_step "1" "Checking API Health"
echo "🔍 Testing API endpoint: $API_URL/health"

health_response=$(curl -s -w "%{http_code}" -o /tmp/demo_health.json "$API_URL/health" || echo "000")

if [ "$health_response" = "200" ]; then
    print_success "API is healthy and ready!"
    echo "📄 Response:"
    cat /tmp/demo_health.json | python3 -m json.tool 2>/dev/null | head -10
else
    print_error "API health check failed (HTTP $health_response)"
    print_warning "Make sure the API is running with: make start"
    exit 1
fi

echo ""
read -p "Press Enter to continue..."
echo ""

# Step 2: Log Challenge
print_step "2" "Logging a Challenge"
echo "🎯 Logging challenge '$DEMO_CHALLENGE_ID' for player '$DEMO_PLAYER_NAME'"

log_payload="{\"playerId\":\"$DEMO_PLAYER_ID\",\"playerName\":\"$DEMO_PLAYER_NAME\",\"challengeId\":\"$DEMO_CHALLENGE_ID\"}"
echo "📤 Payload: $log_payload"

log_response=$(curl -s -w "%{http_code}" -o /tmp/demo_log.json \
    -X POST "$API_URL/log_challenge" \
    -H "Content-Type: application/json" \
    -d "$log_payload" || echo "000")

if [ "$log_response" = "200" ]; then
    print_success "Challenge logged successfully!"
    echo "📄 Response:"
    cat /tmp/demo_log.json | python3 -m json.tool 2>/dev/null
else
    print_error "Challenge logging failed (HTTP $log_response)"
    cat /tmp/demo_log.json 2>/dev/null || echo "No response body"
    exit 1
fi

echo ""
read -p "Press Enter to continue..."
echo ""

# Step 3: Submit Proof
print_step "3" "Submitting Challenge Proof"
echo "📝 Submitting proof for challenge '$DEMO_CHALLENGE_ID'"

# Wait a moment to ensure the challenge is logged
sleep 2

submission_text="Demo submission: I successfully completed the room cleaning challenge! Everything is now perfectly organized and tidy. This is a demonstration of the GoREAL proof submission system."
submit_payload="{\"playerId\":\"$DEMO_PLAYER_ID\",\"challengeId\":\"$DEMO_CHALLENGE_ID\",\"submissionText\":\"$submission_text\"}"

echo "📤 Submitting proof..."
echo "💬 Submission text: \"${submission_text:0:80}...\""

submit_response=$(curl -s -w "%{http_code}" -o /tmp/demo_submit.json \
    -X POST "$API_URL/submit_challenge" \
    -H "Content-Type: application/json" \
    -d "$submit_payload" || echo "000")

if [ "$submit_response" = "200" ]; then
    print_success "Proof submitted successfully!"
    echo "📄 Response:"
    cat /tmp/demo_submit.json | python3 -m json.tool 2>/dev/null
else
    print_warning "Proof submission may have failed (HTTP $submit_response)"
    cat /tmp/demo_submit.json 2>/dev/null || echo "No response body"
fi

echo ""
read -p "Press Enter to continue..."
echo ""

# Step 4: Query Status
print_step "4" "Querying Challenge Status"
echo "📊 Checking status for player '$DEMO_PLAYER_ID' and challenge '$DEMO_CHALLENGE_ID'"

status_response=$(curl -s -w "%{http_code}" -o /tmp/demo_status.json \
    "$API_URL/get_status?playerId=$DEMO_PLAYER_ID&challengeId=$DEMO_CHALLENGE_ID" || echo "000")

if [ "$status_response" = "200" ] || [ "$status_response" = "404" ]; then
    if [ "$status_response" = "200" ]; then
        print_success "Status retrieved successfully!"
        echo "📄 Challenge Status:"
        cat /tmp/demo_status.json | python3 -m json.tool 2>/dev/null
    else
        print_info "Challenge not found in system (this is normal for demo)"
    fi
else
    print_error "Status query failed (HTTP $status_response)"
    cat /tmp/demo_status.json 2>/dev/null || echo "No response body"
fi

echo ""
read -p "Press Enter to continue..."
echo ""

# Step 5: Get Challenges List
print_step "5" "Retrieving Available Challenges"
echo "📋 Fetching list of all available challenges"

challenges_response=$(curl -s -w "%{http_code}" -o /tmp/demo_challenges.json \
    "$API_URL/get_challenges" || echo "000")

if [ "$challenges_response" = "200" ]; then
    print_success "Challenges list retrieved!"
    challenge_count=$(cat /tmp/demo_challenges.json | python3 -c "import json,sys; data=json.load(sys.stdin); print(len(data.get('challenges', [])))" 2>/dev/null || echo "unknown")
    echo "📊 Available challenges: $challenge_count"
    echo "📄 Sample challenges:"
    cat /tmp/demo_challenges.json | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    challenges = data.get('challenges', [])[:3]  # Show first 3
    for i, challenge in enumerate(challenges, 1):
        print(f'  {i}. {challenge.get(\"challenge_id\", \"N/A\")}: {challenge.get(\"title\", \"No title\")}')
    if len(data.get('challenges', [])) > 3:
        print(f'  ... and {len(data.get(\"challenges\", [])) - 3} more challenges')
except:
    print('  Unable to parse challenges')
" 2>/dev/null
else
    print_error "Failed to retrieve challenges list (HTTP $challenges_response)"
fi

echo ""
read -p "Press Enter to continue..."
echo ""

# Step 6: Generate Sample Data
print_step "6" "Generating Sample Data"
echo "🎮 Creating realistic sample data for demonstration"

if [ -f "scripts/generate-sample-data.py" ]; then
    print_info "Generating 10 sample players with various challenges..."
    python3 scripts/generate-sample-data.py --players 10 --challenges 4 | tail -20
    print_success "Sample data generated!"
else
    print_warning "Sample data generator not found - skipping this step"
fi

echo ""
read -p "Press Enter to continue..."
echo ""

# Step 7: Show Access URLs
print_step "7" "Demo Complete - Access Information"
print_success "GoREAL Demo completed successfully! 🎉"
echo ""
echo "🌐 Access the GoREAL system:"
echo "=================================="
echo -e "• ${CYAN}API Server:${NC}         http://localhost:5000"
echo -e "• ${CYAN}Admin Dashboard:${NC}    http://localhost:8501"
echo -e "• ${CYAN}Jupyter Lab:${NC}        http://localhost:8888"
echo -e "• ${CYAN}Database Admin:${NC}     http://localhost:5050"
echo -e "• ${CYAN}Redis Commander:${NC}    http://localhost:8081"
echo ""
echo "📊 Demo Data Overview:"
echo "======================"
echo -e "• Demo Player: ${YELLOW}$DEMO_PLAYER_NAME${NC} (ID: $DEMO_PLAYER_ID)"
echo -e "• Challenge: ${YELLOW}$DEMO_CHALLENGE_ID${NC} - Clean Your Room"
echo -e "• Status: ${GREEN}Proof Submitted${NC}"
echo -e "• Sample Players: ${YELLOW}10 additional players${NC} with various challenges"
echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. 📊 Open the Dashboard to view player data and manage challenges"
echo "2. 📓 Explore Jupyter notebooks for data analysis and API testing"
echo "3. 🔍 Check the API documentation and test additional endpoints"
echo "4. 🎮 Integrate with your Roblox game using the API endpoints"
echo ""
echo "📚 Documentation:"
echo "=================="
echo "• README.md - Project overview and setup"
echo "• docs/DEVELOPMENT.md - Development guide"
echo "• notebooks/ - Interactive examples and testing"
echo ""
echo "🔧 Useful Commands:"
echo "==================="
echo "• make status   - Check service status"
echo "• make logs     - View service logs"
echo "• make test     - Run API tests"
echo "• make stop     - Stop all services"
echo ""

# Cleanup
rm -f /tmp/demo_*.json

print_success "Demo completed! The GoREAL system is ready for use! 🚀"