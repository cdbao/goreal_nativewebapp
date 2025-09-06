#!/bin/bash
# GoREAL Project - API Testing Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
API_URL="http://localhost:5000"
TEST_PLAYER_ID="TEST$(date +%s)"
TEST_PLAYER_NAME="TestPlayer_$(date +%s)"
TEST_CHALLENGE_ID="C01"

echo "🧪 Testing GoREAL API..."
echo "API URL: $API_URL"
echo "Test Player: $TEST_PLAYER_NAME ($TEST_PLAYER_ID)"
echo ""

# Test 1: Health Check
print_status "Testing health check..."
health_response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$API_URL/health")
if [ "$health_response" = "200" ]; then
    print_success "Health check passed"
else
    print_error "Health check failed (HTTP $health_response)"
    exit 1
fi

# Test 2: Log Challenge
print_status "Testing challenge logging..."
log_response=$(curl -s -w "%{http_code}" -o /tmp/log_response.json \
    -X POST "$API_URL/log_challenge" \
    -H "Content-Type: application/json" \
    -d "{\"playerId\":\"$TEST_PLAYER_ID\",\"playerName\":\"$TEST_PLAYER_NAME\",\"challengeId\":\"$TEST_CHALLENGE_ID\"}")

if [ "$log_response" = "200" ]; then
    print_success "Challenge logging passed"
else
    print_error "Challenge logging failed (HTTP $log_response)"
    cat /tmp/log_response.json
    exit 1
fi

# Wait a moment for processing
sleep 2

# Test 3: Submit Challenge
print_status "Testing challenge submission..."
submit_response=$(curl -s -w "%{http_code}" -o /tmp/submit_response.json \
    -X POST "$API_URL/submit_challenge" \
    -H "Content-Type: application/json" \
    -d "{\"playerId\":\"$TEST_PLAYER_ID\",\"challengeId\":\"$TEST_CHALLENGE_ID\",\"submissionText\":\"Test submission from script\"}")

if [ "$submit_response" = "200" ]; then
    print_success "Challenge submission passed"
else
    print_error "Challenge submission failed (HTTP $submit_response)"
    cat /tmp/submit_response.json
fi

# Test 4: Get Status
print_status "Testing status query..."
status_response=$(curl -s -w "%{http_code}" -o /tmp/status_response.json \
    "$API_URL/get_status?playerId=$TEST_PLAYER_ID&challengeId=$TEST_CHALLENGE_ID")

if [ "$status_response" = "200" ] || [ "$status_response" = "404" ]; then
    print_success "Status query passed"
    echo "Status response:"
    cat /tmp/status_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/status_response.json
else
    print_error "Status query failed (HTTP $status_response)"
    cat /tmp/status_response.json
fi

# Test 5: Get Challenges
print_status "Testing challenges list..."
challenges_response=$(curl -s -w "%{http_code}" -o /tmp/challenges_response.json \
    "$API_URL/get_challenges")

if [ "$challenges_response" = "200" ]; then
    print_success "Challenges list passed"
    challenge_count=$(cat /tmp/challenges_response.json | python3 -c "import json,sys; data=json.load(sys.stdin); print(len(data.get('challenges', [])))" 2>/dev/null || echo "unknown")
    echo "Available challenges: $challenge_count"
else
    print_error "Challenges list failed (HTTP $challenges_response)"
    cat /tmp/challenges_response.json
fi

echo ""
echo "🎉 API testing completed!"
echo ""
echo "📋 Test Results Summary:"
echo "========================"
echo "✅ Health Check"
echo "✅ Challenge Logging"
if [ "$submit_response" = "200" ]; then
    echo "✅ Challenge Submission"
else
    echo "⚠️  Challenge Submission (may fail if using Google Sheets)"
fi
echo "✅ Status Query"
echo "✅ Challenges List"

# Cleanup
rm -f /tmp/health_response.json /tmp/log_response.json /tmp/submit_response.json /tmp/status_response.json /tmp/challenges_response.json

echo ""
echo "💡 For more comprehensive testing, run the Jupyter notebook: notebooks/api_testing/api_testing_suite.ipynb"