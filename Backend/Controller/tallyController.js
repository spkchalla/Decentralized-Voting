import IpfsVoteCID from "../Model/IPFS_Vote_CID_Model.js";
import IpfsRegistrationCID from "../Model/IPFS_Registration_CID_Model.js";
import IPFSRegistration from "../Model/IPFSRegistration_Model.js";
import Election from "../Model/Election_Model.js";
import Candidate from "../Model/Candidate_Model.js";
import { fetchFromIPFS } from "../Utils/ipfsUtils.js";
import { hmacSHA256, decryptUserData } from "../Utils/voteEncryptionUtil.js";
import {
  decryptElectionPrivateKey,
  decryptAndVerifyVote,
} from "../Utils/voteDecryptionUtil.js";
import crypto from "crypto";

/**
 * Admin-only endpoint to run tally for an election
 * Fetches all votes from IPFS, validates them, and counts votes for each candidate
 * 
 * Required body parameters:
 * - electionId: the election ObjectId
 * - electionPassword: the password used to encrypt the election private key
 */
export const runTally = async (req, res) => {
  try {
    const { electionId, electionPassword } = req.body;

    // Validate required fields
    if (!electionId || !electionPassword) {
      return res.status(400).json({
        success: false,
        error: "electionId and electionPassword are required",
      });
    }

    // Fetch the election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({
        success: false,
        error: "Election not found",
      });
    }

    // Check if election has finished
    if (election.status !== 'Finished') {
      return res.status(400).json({
        success: false,
        error: `Cannot run tally - Election status is "${election.status}". Tally can only be run on Finished elections.`,
        currentStatus: election.status,
        allowedStatus: 'Finished'
      });
    }

    // Decrypt the election's private key
    const ecPrivateKeyPem = await decryptElectionPrivateKey(
      election.ecPrivateKey,
      election.ecPrivateKeyDerivationSalt,
      election.ecPrivateKeyIV,
      election.ecPrivateKeyAuthTag,
      electionPassword
    );

    // Fetch all vote CIDs for this election
    const voteRecords = await IpfsVoteCID.find({ electionId });

    if (voteRecords.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No votes found for this election",
        results: [],
        winner: null,
      });
    }

    // Initialize vote count map and details array
    const voteCounts = new Map(); // candidateId -> count
    const voteDetails = []; // Array to store details for every vote
    let validVotes = 0;
    let duplicateVotes = 0;
    let invalidVotes = 0;

    // CRITICAL FIX: Reset state before tallying
    // Since we process ALL votes from IPFS, we must reset the "hasVoted" flags 
    // and candidate counts to ensure a fresh, correct tally every time.
    await Candidate.updateMany({ currentElection: electionId }, { votes: 0 });
    await IPFSRegistration.updateMany({ election: electionId }, { hasVoted: false });
    console.log("Tally State Reset: Cleared vote counts and hasVoted flags.");

    // --- NEW: Fetch Registration Data from IPFS ---
    console.log("Fetching registration data from IPFS...");
    const registrationCids = await IpfsRegistrationCID.find({ electionId });
    
    // Map to store valid registrations: tokenHash -> { publicKeyHash, hasVoted, mongoId }
    const validRegistrations = new Map();

    // Helper to fetch and parse registration
    const fetchRegistration = async (regCidDoc) => {
        try {
            const { data } = await fetchFromIPFS(regCidDoc.cid);
            if (data && data.tokenHash && data.publicKeyHash) {
                // Find corresponding Mongo ID for status updates
                // We still need the Mongo ID to update 'hasVoted' status in DB
                const mongoReg = await IPFSRegistration.findOne({ 
                    tokenHash: data.tokenHash, 
                    election: electionId 
                }).select('_id hasVoted');

                if (mongoReg) {
                    validRegistrations.set(data.tokenHash, {
                        publicKeyHash: data.publicKeyHash,
                        hasVoted: false, // Reset state as per Tally start
                        mongoId: mongoReg._id
                    });
                }
            }
        } catch (err) {
            console.error(`Failed to fetch registration CID ${regCidDoc.cid}:`, err.message);
        }
    };

    // Parallel fetch with concurrency limit (optional, simple Promise.all for now)
    // For very large elections, we might want to batch this
    await Promise.all(registrationCids.map(fetchRegistration));
    console.log(`Loaded ${validRegistrations.size} valid registrations from IPFS.`);
    // ----------------------------------------------

    // Process each vote
    for (const voteRecord of voteRecords) {
      try {
        // Step 1: Fetch vote from IPFS
        let votePayload;
        try {
          const { data } = await fetchFromIPFS(voteRecord.cid);
          votePayload = data;

          // Debug: Log what we received from IPFS
          console.log(`\n=== TALLY DEBUG: Vote CID ${voteRecord.cid.slice(0, 10)}... ===`);
          console.log('Payload keys:', votePayload ? Object.keys(votePayload) : 'null');
        } catch (err) {
          invalidVotes++;
          voteDetails.push({
            cid: voteRecord.cid,
            status: "Invalid",
            reason: `Failed to fetch from IPFS: ${err.message}`
          });
          continue;
        }

        // Validate payload structure
        const missingFields = [];
        if (!votePayload.encryptedVote) missingFields.push('encryptedVote');
        if (!votePayload.signedVote) missingFields.push('signedVote');
        if (!votePayload.tokenHash) missingFields.push('tokenHash');
        if (!votePayload.voterPublicKey) missingFields.push('voterPublicKey');

        if (missingFields.length > 0) {
          invalidVotes++;
          voteDetails.push({
            cid: voteRecord.cid,
            status: "Invalid",
            reason: `Invalid vote payload structure - missing fields: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Step 2: Duplicate check
        const { tokenHash, voterPublicKey } = votePayload;

        // Compute hash of voter's public key (Must match Registration logic: HMAC-SHA256)
        const pubKeyHash = hmacSHA256(voterPublicKey, process.env.HMAC_SECRET_KEY);

        // Check if this registration has already been used
        // NEW: Check against in-memory map populated from IPFS
        const registrationData = validRegistrations.get(tokenHash);

        if (!registrationData) {
          // Token not found in valid registrations (from IPFS)
          invalidVotes++;
          voteDetails.push({
            cid: voteRecord.cid,
            status: "Invalid",
            reason: "Registration not found in IPFS data",
            technicalDetails: {
                providedTokenHash: tokenHash.substring(0, 16) + '...',
                issue: "Token hash not found in valid registrations loaded from IPFS"
            }
          });
          continue;
        }

        // Verify Public Key Hash
        if (registrationData.publicKeyHash !== pubKeyHash) {
             invalidVotes++;
             voteDetails.push({
                cid: voteRecord.cid,
                status: "Invalid",
                reason: "Public key mismatch",
                technicalDetails: {
                    providedPublicKeyHash: pubKeyHash.substring(0, 16) + '...',
                    expectedPublicKeyHash: registrationData.publicKeyHash.substring(0, 16) + '...',
                    issue: "Public key hash does not match registration data from IPFS"
                }
             });
             continue;
        }

        if (registrationData.hasVoted) {
          duplicateVotes++;
          voteDetails.push({
            cid: voteRecord.cid,
            status: "Duplicate",
            reason: "Voter has already cast a vote in this election",
            technicalDetails: {
              tokenHash: tokenHash.substring(0, 16) + '...',
              registrationId: registrationData.mongoId.toString(),
              previouslyVoted: true
            }
          });
          continue; // Skip duplicate vote
        }

        // Step 3: Decrypt and verify vote
        let candidateObjectIdHex;
        try {
          candidateObjectIdHex = await decryptAndVerifyVote(
            votePayload.encryptedVote,
            votePayload.signedVote,
            voterPublicKey,
            ecPrivateKeyPem
          );
        } catch (err) {
          invalidVotes++;
          voteDetails.push({
            cid: voteRecord.cid,
            status: "Invalid",
            reason: `Vote decryption/verification failed: ${err.message}`
          });
          continue;
        }

        // Step 4: Verify candidate exists
        const candidate = await Candidate.findById(candidateObjectIdHex);
        if (!candidate) {
          invalidVotes++;
          voteDetails.push({
            cid: voteRecord.cid,
            status: "Invalid",
            reason: `Candidate ID ${candidateObjectIdHex} not found in database`
          });
          continue;
        }

        // Step 5: Increment vote count
        const currentCount = voteCounts.get(candidateObjectIdHex) || 0;
        voteCounts.set(candidateObjectIdHex, currentCount + 1);

        // Step 6: Mark registration as used
        // Step 6: Mark registration as used
        // Update in-memory map
        registrationData.hasVoted = true;
        
        // Update MongoDB to keep it in sync (as requested)
        await IPFSRegistration.findByIdAndUpdate(registrationData.mongoId, { hasVoted: true });

        validVotes++;
        voteDetails.push({
          cid: voteRecord.cid,
          status: "Valid",
          reason: "Vote successfully decrypted, verified, and counted",
          candidateId: candidateObjectIdHex,
          candidateName: candidate.name,
          technicalDetails: {
            tokenHash: tokenHash.substring(0, 16) + '...',
            publicKeyHash: pubKeyHash.substring(0, 16) + '...',
            signatureVerified: true,
            decryptionMethod: 'RSA-OAEP with Election Commission private key',
            signatureVerified: true,
            decryptionMethod: 'RSA-OAEP with Election Commission private key',
            registrationId: registrationData.mongoId.toString(),
            voteEncryptionValid: true
          }
        });

      } catch (err) {
        invalidVotes++;
        voteDetails.push({
          cid: voteRecord.cid,
          status: "Invalid",
          reason: `Unexpected processing error: ${err.message}`
        });
      }
    }

    // Update candidate vote counts in database
    for (const [candidateId, count] of voteCounts) {
      await Candidate.findByIdAndUpdate(candidateId, { votes: count });
    }

    // Determine winner
    let winner = null;
    let maxVotes = 0;
    for (const [candidateId, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = candidateId;
      }
    }

    // Fetch all candidates with their vote counts for the result
    const results = [];
    for (const [candidateId, count] of voteCounts) {
      const candidate = await Candidate.findById(candidateId).select("_id name votes");
      if (candidate) {
        results.push({
          _id: candidate._id,
          name: candidate.name,
          voteCount: count,
        });
      }
    }

    // Sort results by vote count (descending)
    results.sort((a, b) => b.voteCount - a.voteCount);

    // Calculate Margin
    let margin = 0;
    if (results.length > 0) {
      const winnerVotes = results[0].voteCount;
      const runnerUpVotes = results.length > 1 ? results[1].voteCount : 0;
      margin = winnerVotes - runnerUpVotes;
    }

    // Prepare winner details
    let winnerDetails = null;
    if (winner) {
      const winnerCandidate = await Candidate.findById(winner).select(
        "_id name"
      );
      if (winnerCandidate) {
        winnerDetails = {
          _id: winnerCandidate._id,
          name: winnerCandidate.name,
          voteCount: maxVotes,
          margin: margin
        };
      }
    }

    // Return comprehensive tally results
    return res.status(200).json({
      success: true,
      message: "Tally completed successfully",
      statistics: {
        totalVotesProcessed: voteRecords.length,
        validVotes,
        duplicateVotes,
        invalidVotes,
      },
      results, // All candidates with vote counts
      winner: winnerDetails, // Winner details
      voteDetails: voteDetails, // Detailed report for every vote
    });
  } catch (err) {
    console.error("Error in runTally:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * Admin-only endpoint to get current tally results (read-only, without reprocessing)
 * Returns current vote counts for all candidates
 */
export const getTallyResults = async (req, res) => {
  try {
    const { electionId } = req.query;

    if (!electionId) {
      return res.status(400).json({
        success: false,
        error: "electionId is required",
      });
    }

    // Verify election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({
        success: false,
        error: "Election not found",
      });
    }

    // Check if election has finished
    if (election.status !== 'Finished') {
      return res.status(400).json({
        success: false,
        error: `Cannot view results - Election status is "${election.status}". Results can only be viewed for Finished elections.`,
        currentStatus: election.status,
        allowedStatus: 'Finished'
      });
    }

    // Fetch all candidates for this election with their vote counts
    const candidates = await Candidate.find({
      currentElection: electionId,
    }).select("_id name votes");

    // Sort by votes (descending)
    candidates.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    // Determine winner
    let winner = null;
    if (candidates.length > 0 && candidates[0].votes > 0) {
      winner = {
        _id: candidates[0]._id,
        name: candidates[0].name,
        voteCount: candidates[0].votes,
      };
    }

    // Format results
    const results = candidates.map((candidate) => ({
      _id: candidate._id,
      name: candidate.name,
      voteCount: candidate.votes || 0,
    }));

    return res.status(200).json({
      success: true,
      results,
      winner,
    });
  } catch (err) {
    console.error("Error in getTallyResults:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * Admin-only endpoint to reset tally for an election (for testing/auditing)
 * Resets all candidate vote counts and marks all registrations as not voted
 */
export const resetTally = async (req, res) => {
  try {
    const { electionId } = req.body;

    if (!electionId) {
      return res.status(400).json({
        success: false,
        error: "electionId is required",
      });
    }

    // Verify election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({
        success: false,
        error: "Election not found",
      });
    }

    // Reset all candidate votes for this election
    await Candidate.updateMany(
      { currentElection: electionId },
      { votes: 0 }
    );

    // Reset all registrations for this election
    await IPFSRegistration.updateMany(
      { election: electionId },
      { hasVoted: false }
    );

    return res.status(200).json({
      success: true,
      message: "Tally reset successfully for election",
    });
  } catch (err) {
    console.error("Error in resetTally:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
