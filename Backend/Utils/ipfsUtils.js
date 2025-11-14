// utils/ipfsUtils.js
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PINATA_JWT = process.env.PINATA_JWT;
const GATEWAY = process.env.PINATA_GATEWAY;

/**
 * Upload JSON data to IPFS via Pinata
 * @param {Object} jsonData - The JSON data to upload
 * @param {string} [name] - Optional name for the pinned file
 */
export const uploadToIPFS = async (jsonData, name = "unnamed-file") => {
  try {
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataMetadata: {
          name, // custom name for Pinata dashboard
        },
        pinataOptions: {
          cidVersion: 1,
        },
        pinataContent: jsonData,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    const { IpfsHash } = response.data;
    const url = `${GATEWAY}/ipfs/${IpfsHash}`;

    return { success: true, IpfsHash, url };
  } catch (error) {
    console.error(
      "Error uploading to IPFS:",
      error.response?.data || error.message
    );
    throw new Error("Failed to upload to IPFS");
  }
};

/**
 * Fetch JSON data back from IPFS
 */
export const fetchFromIPFS = async (cid) => {
  try {
    const response = await axios.get(`${GATEWAY}/ipfs/${cid}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error fetching from IPFS:", error.message);
    throw new Error("Failed to fetch from IPFS");
  }
};
