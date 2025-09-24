import argon2 from 'argon2';
import crypto from 'crypto';

const AES_ALGO = 'aes-256-gcm';
const AES_IV_LENGTH = 12; // 96-bit IV is recommended for GCM

const generateIV = () => crypto.randomBytes(AES_IV_LENGTH);

export const deriveAESKey = async (password, salt = null) =>{
    if(!salt){
        salt = crypto.randomBytes(16);
    }
    const key = await argon2.hash(password, {type: argon2.argon2id, salt, raw: true, hashLength: 32});
    return {key, salt};
};

export const encryptPrivateKey = (privateKey, aesKey)=>{
    const iv = generateIV();
    const cipher = crypto.createCipheriv(AES_ALGO, aesKey, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {encryptedData: encrypted, iv: iv.toString('hex')};
};

export const decryptPrivateKey = (encryptedData, aesKey, ivHex) =>{
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(AES_ALGO, aesKey, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
