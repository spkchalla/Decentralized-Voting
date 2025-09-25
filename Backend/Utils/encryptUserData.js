import argon2 from 'argon2';
import crypto from 'crypto';

const AES_ALGO = 'aes-256-gcm';
const AES_IV_LENGTH = 12; // 96-bit IV recommended for GCM

const generateIV = () => crypto.randomBytes(AES_IV_LENGTH);

// Derive AES key from password using Argon2id
export const deriveAESKey = async (password, salt = null) => {
    if (!salt) {
        salt = crypto.randomBytes(16);
    }
    // Use argon2id to derive a raw 32-byte key
    const key = await argon2.hash(password, {
        type: argon2.argon2id,
        salt,
        hashLength: 32,
        raw: true,
    });
    return { key, salt };
};

// Encrypt any user field (priv/pub key, token, etc.)
export const encryptUserData = (data, aesKey) => {
    const iv = generateIV();
    const cipher = crypto.createCipheriv(AES_ALGO, aesKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
        encryptedUserData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
    };
};

// Decrypt any user field
export const decryptUserData = (encryptedUserData, aesKey, ivHex, authTagHex) => {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(AES_ALGO, aesKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedUserData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
