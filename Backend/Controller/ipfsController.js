import PinataSDK from "@pinata/sdk";
import {Vote} from "../Model"


export const registerVoter = async (req, res) => {
  try {
    const { pubKeyHash, tokenHash } = req.body;
    const ipfsData = { pubKeyHash, tokenHash };

    const result = await PinataClient.pinJSONToIPFS(ipfsData, {
      pinataMetadata: { name: `registration-${pubKeyHash},json` },
      pinataOptions: { cidVersion: 1 },
    });

    const cid = result.IpfsHash;
    const url = `${process.env.PINATA_GATEWAY}${cid}`;

    //await RegistrationCID.create({ cid, pubKeyHash });

    res.json({ success: true, cid, url });
  } catch (error) {
    console.error("IPFS registration error: ", error);
    res.status(500).json({ success: false, error: "IPFS upload failed" });
  }
};

// Function for voting

export const sendVoteToIpfs = async (req, res) => {
  try {
    const { cand_id, voterpubkey, pub_key_hash, token } = req.body;
    const ipfsData = { cand_id, voterpubkey, pub_key_hash, token };
    const result = await pinata.pinJSONToIPFS(ipfsData, {
      pinataMetadata: {
        name: `vote-${pub_key_hash}.json`, // File name in Pinata dashboard for easy ID
      },
      pinataOptions: {
        cidVersion: 1, // Use CID v1 for compatibility
      },
    });

    const cid = result.IpfsHash;

    const url = `${process.env.PINATA_GATEWAY}${cid}`;

    // Need to store the cid in mongo db.
    // await VoteCID.create({cid, pub_key_hash});

    res.json({success: true, cid, url});
  } catch (error) {
    
  }
};
