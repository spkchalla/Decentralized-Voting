import crypto from "crypto";
import bcrypt from "bcrypt";
import argon2 from "argon2"
import { deriveAESKey, decryptUserData } from "./encryptUserData";
import IPFSRegistration_Model from "../Model/IPFSRegistration_Model";

export const decryptWithElectionCommissionPrivateKey = async(encryptedData, electionCommissionPrivateKey)=>{
    const buffer = Buffer.from(encryptedData, "base64");
    const decrypted = crypto.privateDecrypt(
        {
            key: electionCommissionPrivateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        buffer
    );
    return JSON.parse(decrypted.toString());
};

// verfying the token and pub key from registration.
const registrations = await IPFSRegistration.find();

let matchedRecord = null;
for(const reg of registrations){
    const tokenMatches = await bcrypt.compare(plainToken)
}