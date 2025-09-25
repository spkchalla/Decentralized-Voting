import argon2 from 'argon2';
import crypto from 'crypto';

const AES_ALGO = 'aes-256-gcm';
const AES_IV_LENGTH = 12;

// Generate IV
const generateIV = () => crypto.randomBytes(AES_IV_LENGTH);

// Derive AES key from password using Argon2id
export const deriveAESKey = async (password, salt = null) => {
    try {
        if (typeof password !== 'string' || !password) {
            throw new Error('Password must be a non-empty string');
        }
        if (!salt) {
            salt = crypto.randomBytes(16);
        } else if (!Buffer.isBuffer(salt) || salt.length !== 16) {
            throw new Error('Salt must be a 16-byte Buffer');
        }

        const key = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 4,
            parallelism: 2,
            hashLength: 32,
            raw: true,
            salt,
        });

        return { key, salt };
    } catch (error) {
        throw new Error(`Key derivation failed: ${error.message}`);
    }
};

// Encrypt user data (public key, private key, token, etc.)
export const encryptUserData = (data, aesKey) => {
    try {
        if (typeof data !== 'string') {
            throw new Error('Data must be a string (e.g., JSON-serialized)');
        }
        if (!Buffer.isBuffer(aesKey) || aesKey.length !== 32) {
            throw new Error('AES key must be a 32-byte Buffer');
        }

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
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
};

// Decrypt user data
export const decryptUserData = (encryptedUserData, aesKey, ivHex, authTagHex) => {
    try {
        if (!Buffer.isBuffer(aesKey) || aesKey.length !== 32) {
            throw new Error('AES key must be a 32-byte Buffer');
        }
        if (typeof encryptedUserData !== 'string' || typeof ivHex !== 'string' || typeof authTagHex !== 'string') {
            throw new Error('Encrypted data, IV, and auth tag must be strings');
        }
        if (ivHex.length !== AES_IV_LENGTH * 2) {
            throw new Error(`IV must be ${AES_IV_LENGTH} bytes in hex format`);
        }
        if (authTagHex.length !== 32) { // AES-GCM auth tag is 16 bytes (32 hex chars)
            throw new Error('Auth tag must be 16 bytes in hex format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(AES_ALGO, aesKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedUserData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
};