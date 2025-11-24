#!/bin/bash

# Quick Test Helper Script
# This script helps you test the vote tallying system

echo "🧪 Vote Tallying Test Helper"
echo "=============================="
echo ""

# Configuration
BACKEND_URL="http://localhost:5000"
ELECTION_ID="6921b63b1485eb7f1cd22959"

echo "📋 Test Configuration:"
echo "  Backend URL: $BACKEND_URL"
echo "  Election ID: $ELECTION_ID"
echo ""

# Function to make API calls
function api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    if [ -n "$token" ]; then
        if [ -n "$data" ]; then
            curl -X $method "$BACKEND_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data" \
                -s | jq '.'
        else
            curl -X $method "$BACKEND_URL$endpoint" \
                -H "Authorization: Bearer $token" \
                -s | jq '.'
        fi
    else
        if [ -n "$data" ]; then
            curl -X $method "$BACKEND_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data" \
                -s | jq '.'
        else
            curl -X $method "$BACKEND_URL$endpoint" \
                -s | jq '.'
        fi
    fi
}

echo "🔍 Step 1: Check if backend is running..."
if curl -s "$BACKEND_URL/" > /dev/null; then
    echo "✅ Backend is running!"
else
    echo "❌ Backend is not running. Please start it with: npm run server"
    exit 1
fi

echo ""
echo "📝 What would you like to test?"
echo ""
echo "1. Reset election data (clean slate)"
echo "2. Register user for election"
echo "3. Cast a vote"
echo "4. Run tally"
echo "5. Get tally results"
echo "6. Full test (all steps)"
echo ""
read -p "Enter choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo "🔄 Resetting election data..."
        read -p "Enter admin JWT token: " admin_token
        api_call "POST" "/admin/tally/reset" "{\"electionId\":\"$ELECTION_ID\"}" "$admin_token"
        ;;
    2)
        echo ""
        echo "👤 Registering user for election..."
        read -p "Enter user JWT token: " user_token
        read -p "Enter user password: " user_password
        api_call "POST" "/election/register" "{\"electionId\":\"$ELECTION_ID\",\"password\":\"$user_password\"}" "$user_token"
        ;;
    3)
        echo ""
        echo "🗳️  Casting vote..."
        read -p "Enter candidate ID (24 hex chars): " candidate_id
        read -p "Enter user email: " user_email
        read -p "Enter user password: " user_password
        api_call "POST" "/vote/castVote" "{\"candidateId\":\"$candidate_id\",\"password\":\"$user_password\",\"electionId\":\"$ELECTION_ID\",\"email\":\"$user_email\"}"
        ;;
    4)
        echo ""
        echo "📊 Running tally..."
        read -p "Enter admin JWT token: " admin_token
        read -p "Enter election password: " election_password
        api_call "POST" "/admin/tally/run" "{\"electionId\":\"$ELECTION_ID\",\"electionPassword\":\"$election_password\"}" "$admin_token"
        ;;
    5)
        echo ""
        echo "📈 Getting tally results..."
        read -p "Enter admin JWT token: " admin_token
        api_call "GET" "/admin/tally/results?electionId=$ELECTION_ID" "" "$admin_token"
        ;;
    6)
        echo ""
        echo "🚀 Running full test..."
        echo "This will guide you through all steps."
        echo ""
        echo "You'll need:"
        echo "  - Admin JWT token"
        echo "  - User JWT token"
        echo "  - User email and password"
        echo "  - Candidate ID"
        echo "  - Election password"
        echo ""
        read -p "Press Enter to continue..."
        
        # Step 1: Reset
        echo ""
        echo "Step 1/4: Reset election data"
        read -p "Enter admin JWT token: " admin_token
        api_call "POST" "/admin/tally/reset" "{\"electionId\":\"$ELECTION_ID\"}" "$admin_token"
        read -p "Press Enter to continue..."
        
        # Step 2: Register
        echo ""
        echo "Step 2/4: Register user for election"
        read -p "Enter user JWT token: " user_token
        read -p "Enter user password: " user_password
        api_call "POST" "/election/register" "{\"electionId\":\"$ELECTION_ID\",\"password\":\"$user_password\"}" "$user_token"
        read -p "Press Enter to continue..."
        
        # Step 3: Vote
        echo ""
        echo "Step 3/4: Cast vote"
        read -p "Enter candidate ID (24 hex chars): " candidate_id
        read -p "Enter user email: " user_email
        api_call "POST" "/vote/castVote" "{\"candidateId\":\"$candidate_id\",\"password\":\"$user_password\",\"electionId\":\"$ELECTION_ID\",\"email\":\"$user_email\"}"
        read -p "Press Enter to continue..."
        
        # Step 4: Tally
        echo ""
        echo "Step 4/4: Run tally"
        read -p "Enter election password: " election_password
        api_call "POST" "/admin/tally/run" "{\"electionId\":\"$ELECTION_ID\",\"electionPassword\":\"$election_password\"}" "$admin_token"
        
        echo ""
        echo "✅ Full test complete!"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
