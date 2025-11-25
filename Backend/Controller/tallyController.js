import IpfsVoteCID from "../Model/IPFS_Vote_CID_Model.js";
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
        const registration = await IPFSRegistration.findOne({
          tokenHash: tokenHash,
          publicKeyHash: pubKeyHash,
          election: electionId,
        });

        if (!registration) {
          // Determine the SPECIFIC reason for failure
          let specificReason = "Registration not found";
          let failureDetails = {};

          // Check if token exists for this election (regardless of public key)
          const tokenExists = await IPFSRegistration.findOne({
            tokenHash: tokenHash,
            election: electionId,
          });

          // Check if public key exists for this election (regardless of token)
          const publicKeyExists = await IPFSRegistration.findOne({
            publicKeyHash: pubKeyHash,
            election: electionId,
          });

          if (!tokenExists && !publicKeyExists) {
            // Neither token nor public key found - user likely not registered at all
            specificReason = "User not registered for this election";
            failureDetails = {
              providedTokenHash: tokenHash.substring(0, 16) + '...',
              providedPublicKeyHash: pubKeyHash.substring(0, 16) + '...',
              actualIssue: "No registration record found with this token or public key for this election",
              suggestion: "User may not have registered, or registration was unsuccessful"
            };
          } else if (tokenExists && !publicKeyExists) {
            // Token found but public key doesn't match
            specificReason = "Public key mismatch - Token found but belongs to different user";
            failureDetails = {
              issue: "CRYPTOGRAPHIC_KEY_MISMATCH",
              providedTokenHash: tokenHash.substring(0, 16) + '...',
              providedPublicKeyHash: pubKeyHash.substring(0, 16) + '...',
              expectedPublicKeyHash: tokenExists.publicKeyHash.substring(0, 16) + '...',
              fullProvidedPubKeyHash: pubKeyHash,
              fullExpectedPubKeyHash: tokenExists.publicKeyHash,
              registrationId: tokenExists._id.toString(),
              registeredUserId: tokenExists.user?.toString() || 'Unknown',
              actualIssue: "Token is valid but public key doesn't match the registered public key",
              technicalExplanation: `The vote contains a valid token that is registered for this election, but the public key used to sign the vote (hash: ${pubKeyHash.substring(0, 32)}...) does not match the public key registered with this token (hash: ${tokenExists.publicKeyHash.substring(0, 32)}...). This indicates either: (1) The voter is using a different private key than the one generated during registration, (2) An attempt to cast a vote using someone else's token, or (3) The voter's cryptographic keys were regenerated or corrupted.`,
              suggestion: "Vote may be using wrong private key or attempting vote manipulation",
              securityImplication: "HIGH - Possible vote manipulation attempt or compromised voter credentials",
              debugInfo: {
                tokenMatched: true,
                publicKeyMatched: false,
                registrationFound: true,
                keyHashComparison: `Provided: ${pubKeyHash.substring(0, 40)}... vs Expected: ${tokenExists.publicKeyHash.substring(0, 40)}...`
              }
            };
          } else if (!tokenExists && publicKeyExists) {
            // Public key found but token doesn't match
            specificReason = "Token mismatch - Public key found but token is different";
            failureDetails = {
              providedTokenHash: tokenHash.substring(0, 16) + '...',
              expectedTokenHash: publicKeyExists.tokenHash.substring(0, 16) + '...',
              providedPublicKeyHash: pubKeyHash.substring(0, 16) + '...',
              actualIssue: "Public key is valid but token doesn't match the registered token",
              suggestion: "Vote may be using wrong token or attempting token reuse"
            };
          } else {
            // Both exist separately but not together - bizarre case
            specificReason = "Token and public key exist but don't belong to same registration";
            failureDetails = {
              providedTokenHash: tokenHash.substring(0, 16) + '...',
              providedPublicKeyHash: pubKeyHash.substring(0, 16) + '...',
              actualIssue: "Both token and public key are registered but for different users",
              suggestion: "Potential vote manipulation attempt or data corruption"
            };
          }

          invalidVotes++;
          voteDetails.push({
            cid: voteRecord.cid,
            status: "Invalid",
            reason: specificReason,
            technicalDetails: failureDetails
          });
          continue;
        }

        if (registration.hasVoted) {
          duplicateVotes++;
          voteDetails.push({
            cid: voteRecord.cid,
            status: "Duplicate",
            reason: "Voter has already cast a vote in this election",
            technicalDetails: {
              tokenHash: tokenHash.substring(0, 16) + '...',
              publicKeyHash: pubKeyHash.substring(0, 16) + '...',
              registrationId: registration._id.toString(),
              previouslyVoted: true,
              registrationStatus: 'Already marked as voted in database'
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
        registration.hasVoted = true;
        await registration.save();

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
            registrationId: registration._id.toString(),
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
