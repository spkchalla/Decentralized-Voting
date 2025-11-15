# Decentralized Voting - Tally Process Testing Guide

## Overview
The tally process validates all votes stored in IPFS, counts votes for each candidate, and announces election results. It includes:
1. **Duplicate detection** using token hash and public key hash
2. **Vote decryption** using election private key
3. **Signature verification** to ensure vote integrity
4. **Vote demasking** to recover candidate identities
5. **Candidate vote counting** and results aggregation

---

## Prerequisites

### Environment Variables
Ensure these are set in your `.env` file:
```bash
# Server
HMAC_SECRET_KEY=your_server_hmac_secret_key_here
JWT_SECRET=your_jwt_secret_here
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=https://gateway.pinata.cloud
IPFS_API=https://api.pinata.cloud/pinning/pinFileToIPFS
```

### Database Setup
- Ensure MongoDB is running with the Decentralized-Voting database
- Models must be updated: `Candidate` model now has a `votes` field

### Admin Authentication Token
You need a valid JWT token for an admin user. If you don't have one:

```bash
# Step 1: Create an admin user via the admin creation endpoint
# (Use the admin creation controller endpoint)
```

---

## Testing Workflow

### Step 1: Create an Election and Cast Votes

**Create an Election:**
```bash
curl -X POST http://localhost:5000/api/elections/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "University President Election 2025",
    "description": "Election for the position of University President",
    "startDateTime": "2025-11-20T10:00:00Z",
    "endDateTime": "2025-11-21T18:00:00Z",
    "password": "electionPassword123",
    "pinCodes": [560001, 560002],
    "candidates": [
      {
        "_id": "candidate_id_1_here",
        "partyId": "party_id_1_here"
      },
      {
        "_id": "candidate_id_2_here",
        "partyId": "party_id_2_here"
      }
    ],
    "officers": ["officer_id_1", "officer_id_2"]
  }'
```

**Cast Votes** (as a voter):
```bash
curl -X POST http://localhost:5000/api/vote/cast \
  -H "Content-Type: application/json" \
  -d '{
    "email": "voter@example.com",
    "password": "voterPassword123",
    "electionId": "election_id_from_creation",
    "candidateId": "candidate_object_id_hex_24_chars"
  }'
```

Response will include `ipfs` CID and URL. Multiple voters will create multiple IPFS vote entries.

---

### Step 2: Run the Tally Process (Admin-Only)

**Get Admin JWT Token:**

First, authenticate as an admin to get a JWT token:
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminPassword123"
  }'
```

Response will include a JWT token. Save it:
```bash
ADMIN_TOKEN="your_jwt_token_here"
```

**Run Tally:**
```bash
curl -X POST http://localhost:5000/api/admin/tally/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "electionId": "election_id_here",
    "electionPassword": "electionPassword123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tally completed successfully",
  "statistics": {
    "totalVotesProcessed": 3,
    "validVotes": 3,
    "duplicateVotes": 0,
    "invalidVotes": 0
  },
  "results": [
    {
      "_id": "candidate_id_1",
      "name": "Candidate A",
      "voteCount": 2
    },
    {
      "_id": "candidate_id_2",
      "name": "Candidate B",
      "voteCount": 1
    }
  ],
  "winner": {
    "_id": "candidate_id_1",
    "name": "Candidate A",
    "voteCount": 2
  },
  "errors": null
}
```

---

### Step 3: Get Tally Results (Read-Only)

**Retrieve current results without reprocessing votes:**
```bash
curl -X GET "http://localhost:5000/api/admin/tally/results?electionId=election_id_here" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "results": [
    {
      "_id": "candidate_id_1",
      "name": "Candidate A",
      "voteCount": 2
    },
    {
      "_id": "candidate_id_2",
      "name": "Candidate B",
      "voteCount": 1
    }
  ],
  "winner": {
    "_id": "candidate_id_1",
    "name": "Candidate A",
    "voteCount": 2
  }
}
```

---

### Step 4: Reset Tally (For Testing/Auditing)

**Reset vote counts and registrations for an election:**
```bash
curl -X POST http://localhost:5000/api/admin/tally/reset \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "electionId": "election_id_here"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Tally reset successfully for election"
}
```

---

## Error Handling

### Common Errors and Solutions

**Error: "Election not found"**
- Verify `electionId` is correct and exists in the database

**Error: "electionId and electionPassword are required"**
- Ensure both parameters are provided in the request body

**Error: "Not authorized, token failed"**
- Verify the JWT token is valid and has not expired
- Check that the token belongs to an admin user

**Error: "Invalid vote payload structure"**
- The vote payload from IPFS is missing required fields
- Expected fields: `encryptedVote`, `signedVote`, `tokenHash`, `voterPublicKey`

**Error: "Vote signature verification failed"**
- The vote's signature does not match
- This indicates vote tampering or data corruption

**Error: "Candidate not found"**
- The demasked candidate ID does not exist in the database
- Verify candidate IDs are correct before voting

---

## Database State After Tally

### IPFSRegistration Collection
- `hasVoted` field updated to `true` for successfully tallied registrations
- Prevents duplicate vote counting

### Candidate Collection
- `votes` field incremented for each valid vote
- Results are sorted by vote count (highest first)

### Vote Integrity
- All votes are verified using:
  1. **Token hash comparison** (exact match)
  2. **Public key hash comparison** (HMAC-SHA256)
  3. **Signature verification** (RSA-PSS)
  4. **Candidate existence check** (ObjectId lookup)

---

## Testing Checklist

- [ ] Environment variables are set (HMAC_SECRET_KEY, JWT_SECRET, Pinata credentials)
- [ ] MongoDB is running with Decentralized-Voting database
- [ ] At least one election is created
- [ ] At least 3 voters have cast votes
- [ ] Admin user exists and can authenticate
- [ ] Run tally endpoint responds with success status
- [ ] Vote counts match expected results
- [ ] Winner is correctly identified
- [ ] Duplicate votes are detected and skipped
- [ ] Results endpoint returns correct data
- [ ] Reset tally endpoint clears vote counts

---

## Troubleshooting

### Tally Returns No Votes
- Verify IPFS entries exist: query `IpfsVoteCID` collection
- Confirm voters have cast votes successfully
- Check `electionId` matches the correct election

### Vote Decryption Fails
- Verify `electionPassword` is correct
- Ensure election's private key is stored encrypted in DB
- Check `HMAC_SECRET_KEY` environment variable is set

### Signature Verification Fails
- Voter's public key may be corrupted or missing
- Verify votes were encrypted with correct keys
- Check that vote payload includes `voterPublicKey` field

### Performance Issues
- For large numbers of votes (1000+), tally may take several minutes
- IPFS fetching is the bottleneck — ensure stable network connection
- Consider running tally after election closes (off-peak hours)

---

## Example Full Test Script (Bash)

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:5000/api"
ADMIN_TOKEN=""

echo -e "${GREEN}=== Decentralized Voting Tally Test ===${NC}\n"

# Step 1: Admin login
echo "1. Authenticating admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminPassword123"
  }')

ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}Failed to get admin token${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Admin authenticated${NC}\n"

# Step 2: Run tally
echo "2. Running tally..."
TALLY_RESPONSE=$(curl -s -X POST "$BACKEND_URL/admin/tally/run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "electionId": "YOUR_ELECTION_ID",
    "electionPassword": "electionPassword123"
  }')

echo "Tally Response:"
echo $TALLY_RESPONSE | jq '.'

# Step 3: Get results
echo -e "\n3. Fetching results..."
RESULTS=$(curl -s -X GET "$BACKEND_URL/admin/tally/results?electionId=YOUR_ELECTION_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Results:"
echo $RESULTS | jq '.'

echo -e "\n${GREEN}=== Test Complete ===${NC}"
```

Save as `test-tally.sh` and run:
```bash
chmod +x test-tally.sh
./test-tally.sh
```

---

## Notes

- **Security**: The `electionPassword` is only used to decrypt the private key during tally. It is never logged or exposed in responses.
- **Idempotency**: Running tally multiple times will skip already-processed votes (via `hasVoted` flag).
- **Scalability**: For elections with 1000+ votes, tally may take several minutes due to IPFS fetching.

---

## Next Steps

After successful tally:
1. Announce results to voters
2. Archive election data
3. Verify audit logs for compliance
4. Store results in a secure archive (optional)
