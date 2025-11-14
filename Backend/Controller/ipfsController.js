// controller/ipfsController.js
import { uploadToIPFS, fetchFromIPFS } from "../Utils/ipfsUtils.js";

// --- Register Voter ---
export const registerVoterOnIPFS = async (req, res) => {
  try {
    const { pubKeyHash, tokenHash } = req.body;

    if (!pubKeyHash || !tokenHash) {
      return res.status(400).json({
        success: false,
        message: "pubKeyHash and tokenHash are required",
      });
    }

    const payload = { pubKeyHash, tokenHash };
    const fileName = `registration.json`;

    const { IpfsHash, url } = await uploadToIPFS(payload, fileName);

    res.status(201).json({
      message: "Voter registration pinned to IPFS successfully",
      cid: IpfsHash,
      url,
    });
  } catch (error) {
    console.error("Error in registerVoterOnIPFS:", error.message);
    res.status(500).json({ message: "Failed to register voter to IPFS" });
  }
};

// --- Send Vote to IPFS ---
export const sendVoteToIPFS = async (req, res) => {
  try {
    const { encryptedVote, signedVote, encryptedVoterPublicKey, tokenHash } =
      req.body;

    if (!encryptedVote || !encryptedVoterPublicKey || !tokenHash) {
      return res.status(400).json({
        success: false,
        message:
          "encryptedVote, encryptedVoterPublicKey, and tokenHash are required",
      });
    }

    const payload = { encryptedVote, signedVote, encryptedVoterPublicKey, tokenHash };
    const fileName = `vote.json`;

    const { IpfsHash, url } = await uploadToIPFS(payload, fileName);

    res.status(201).json({
      message: "Vote pinned to IPFS successfully",
      cid: IpfsHash,
      url,
    });
  } catch (error) {
    console.error("Error in sendVoteToIPFS:", error.message);
    res.status(500).json({ message: "Failed to send vote to IPFS" });
  }
};

// --- Fetch from IPFS ---
export const fetchDataFromIPFS = async (req, res) => {
  try {
    const { cid } = req.params;
    if (!cid) return res.status(400).json({ message: "CID required" });

    const { data } = await fetchFromIPFS(cid);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching from IPFS:", error.message);
    res.status(500).json({ message: "Failed to fetch from IPFS" });
  }
};
