import axios from "axios";
import dotenv from "dotenv";
import { Vote } from "../Model/IPFSRegistration_Model.js";

dotenv.config();

const PINATA_JWT = process.env.PINATA_JWT;
const GATEWAY = process.env.PINATA_GATEWAY;

// -------- Register Voter --------
export const registerVoter = async (req, res) => {
  try {
    const { pubKeyHash, tokenHash } = req.body;
    const ipfsData = { pubKeyHash, tokenHash };

    // Upload JSON to Pinata using JWT
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      ipfsData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: PINATA_JWT,
        },
      }
    );

    const cid = response.data.IpfsHash;
    const url = `${GATEWAY}/ipfs/${cid}`;

    // await RegistrationCID.create({ cid, pubKeyHash });

    res.json({
      success: true,
      message: "Voter registration uploaded to IPFS successfully",
      cid,
      url,
    });
  } catch (error) {
    console.error(
      "IPFS registration error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      error: "IPFS upload failed",
    });
  }
};

// -------- Send Vote to IPFS --------
export const sendVoteToIpfs = async (req, res) => {
  try {
    const { cand_id, voterpubkey, pub_key_hash, token } = req.body;
    const ipfsData = { cand_id, voterpubkey, pub_key_hash, token };

    // Upload JSON to Pinata using JWT
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      ipfsData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: PINATA_JWT,
        },
      }
    );

    const cid = response.data.IpfsHash;
    const url = `${GATEWAY}/ipfs/${cid}`;

    // await VoteCID.create({ cid, pub_key_hash });

    res.json({
      success: true,
      message: "Vote uploaded to IPFS successfully",
      cid,
      url,
    });
  } catch (error) {
    console.error("Vote upload error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Vote upload failed",
    });
  }
};
