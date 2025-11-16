import IpfsVoteCID from "../Model/IPFS_Vote_CID_Model.js";
import IPFSRegistration from "../Model/IPFSRegistration_Model.js";
import Election from "../Model/Election_Model.js";
import Candidate from "../Model/Candidate_Model.js";
import { fetchFromIPFS } from "../Utils/ipfsUtils.js";
import { hmacSHA256 } from "../Utils/voteEncryptionUtil.js";
import {
  decryptElectionPrivateKey,
  decryptAndVerifyVote,
  decryptUserData,
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

    // Decrypt the election's private key
    const ecPrivateKeyPem = await decryptElectionPrivateKey(
      election.ecPrivateKey,
      election.ecprivateKeyDerivationSalt,
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

    // Initialize vote count map
    const voteCounts = new Map(); // candidateId -> count
    let validVotes = 0;
    let duplicateVotes = 0;
    let invalidVotes = 0;
    const errors = [];

    // Process each vote
    for (const voteRecord of voteRecords) {
      try {
        const { IpfsHash, url } = voteRecord;

        // Step 1: Fetch vote from IPFS
        let votePayload;
        try {
          const { data } = await fetchFromIPFS(voteRecord.cid);
          votePayload = data;
        } catch (err) {
          invalidVotes++;
          errors.push({
            cid: voteRecord.cid,
            error: `Failed to fetch from IPFS: ${err.message}`,
          });
          continue;
        }

        // Validate payload structure
        if (
          !votePayload.encryptedVote ||
          !votePayload.signedVote ||
          !votePayload.tokenHash ||
          !votePayload.voterPublicKey
        ) {
          invalidVotes++;
          errors.push({
            cid: voteRecord.cid,
            error: "Invalid vote payload structure",
          });
          continue;
        }

        // Step 2: Duplicate check
        const { tokenHash, voterPublicKey } = votePayload;

        // Compute hash of voter's public key
        const pubKeyHash = hmacSHA256(voterPublicKey, process.env.HMAC_SECRET_KEY);

        // Debug: log incoming vote fingerprint and computed pubKeyHash
        try {
          const fp = (s) => (s && s.length > 12 ? `${s.slice(0,6)}...${s.slice(-6)}` : s);
          console.log(`TALLY_LOOKUP: cid=${voteRecord.cid} tokenHash=${fp(tokenHash)} pubKeyHash=${fp(pubKeyHash)}`);
        } catch (e) {}

        // Check if this registration has already been used
        const registration = await IPFSRegistration.findOne({
          tokenHash: tokenHash,
          publicKeyHash: pubKeyHash,
          election: electionId,
        });

        if (!registration) {
          try {
            console.log(`TALLY_LOOKUP_NOTFOUND: cid=${voteRecord.cid} tokenHash=${tokenHash ? tokenHash.slice(0,6) : 'null'} pubKeyHash=${pubKeyHash ? pubKeyHash.slice(0,6) : 'null'}`);
          } catch (e) {}
        }

        if (!registration) {
          invalidVotes++;
          errors.push({
            cid: voteRecord.cid,
            error: "Registration not found for this vote",
          });
          continue;
        }

        if (registration.hasVoted) {
          duplicateVotes++;
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
          errors.push({
            cid: voteRecord.cid,
            error: `Vote decryption/verification failed: ${err.message}`,
          });
          continue;
        }

        // Step 4: Verify candidate exists
        const candidate = await Candidate.findById(candidateObjectIdHex);
        if (!candidate) {
          invalidVotes++;
          errors.push({
            cid: voteRecord.cid,
            error: `Candidate ${candidateObjectIdHex} not found`,
          });
          continue;
        }

        // Step 5: Increment vote count
        const currentCount = voteCounts.get(candidateObjectIdHex) || 0;
        voteCounts.set(candidateObjectIdHex, currentCount + 1);

        // Step 6: Mark registration as used
        registration.hasVoted = true;
        await registration.save();

        validVotes++;
      } catch (err) {
        invalidVotes++;
        errors.push({
          cid: voteRecord.cid,
          error: `Unexpected error: ${err.message}`,
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
      errors: errors.length > 0 ? errors : null, // Errors if any
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
