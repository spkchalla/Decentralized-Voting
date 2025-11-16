import argon2 from 'argon2';
import crypto from 'crypto';

const AES_ALGO = 'aes-256-gcm';
const AES_IV_LENGTH = 12;

// Generate IV
const generateIV = () => crypto.randomBytes(AES_IV_LENGTH);

// RSA Key Pair Generation (MISSING FUNCTION)
export const generateRSAKeyPair = () => {
    return new Promise((resolve, reject) => {
        crypto.generateKeyPair('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        }, (err, publicKey, privateKey) => {
            if (err) reject(err);
            resolve({ publicKey, privateKey });
        });
    });
};

// Token Generation (MISSING FUNCTION)
export const generateToken = () => {
    return crypto.randomBytes(48).toString('hex'); // 96-character hex token
};

// Voter ID Generation (MISSING FUNCTION)
export const generateVoterId = () => {
    return 'V' + crypto.randomBytes(8).toString('hex').toUpperCase();
};

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

// Encrypt user data
export const encryptUserData = (data, aesKey) => {
    try {
        if (typeof data !== 'string') {
            throw new Error('Data must be a string');
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

// HMAC-SHA256 function
export const hmacSHA256 = (data, secretKey) => {
    try {
        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(data);
        return hmac.digest('hex');
    } catch (err) {
        throw new Error(`hmacSHA256 Error: ${err.message}`);
    }
};

// Hash token using HMAC-SHA256
export const hashToken = (token) => {
    try {
        const secretKey = process.env.HMAC_SECRET_KEY;
        if (!secretKey) {
            throw new Error('HMAC_SECRET_KEY not found in environment variables');
        }
        return hmacSHA256(token, secretKey);
    } catch (err) {
        throw new Error(`hashToken Error: ${err.message}`);
    }
};

// Hash public key using HMAC-SHA256 (server-side secret)
export const hashPublicKey = (publicKey) => {
    try {
        const secretKey = process.env.HMAC_SECRET_KEY;
        if (!secretKey) {
            throw new Error('HMAC_SECRET_KEY not found in environment variables');
        }
        return hmacSHA256(publicKey, secretKey);
    } catch (err) {
        throw new Error(`hashPublicKey Error: ${err.message}`);
    }
};

// Generate cryptographic fields (SECURITY FIXED)
export const generateCryptoFields = async (password) => {
    try {
        // Step 1: Generate original cryptographic materials
        const { publicKey, privateKey } = await generateRSAKeyPair();
        const token = generateToken();
        
        // Step 2: Derive AES key from user's password
        const { key: aesKey, salt } = await deriveAESKey(password);
        
        // Step 3: Encrypt all sensitive data with AES key
        const { encryptedUserData: encryptedPrivateKey, iv: privateKeyIV, authTag: privateKeyAuthTag } = 
            encryptUserData(privateKey, aesKey);
        const { encryptedUserData: encryptedPublicKey, iv: publicKeyIV, authTag: publicKeyAuthTag } = 
            encryptUserData(publicKey, aesKey);
        const { encryptedUserData: encryptedToken, iv: tokenIV, authTag: tokenAuthTag } = 
            encryptUserData(token, aesKey);
        
        // Step 4: Generate hashes for IPFSRegistration
        const tokenHash = hashToken(token);
        const publicKeyHash = hashPublicKey(publicKey);

        // Debug: log generated registration hashes (short fingerprints)
        try {
            const fp = (s) => (s && s.length > 12 ? `${s.slice(0,6)}...${s.slice(-6)}` : s);
            console.log(`GEN_CRYPTO: token=${fp(token)} tokenHash=${fp(tokenHash)} publicKeyHash=${fp(publicKeyHash)}`);
        } catch (e) {
            // ignore logging errors
        }

        // ✅ SECURITY FIX: Only return what's needed for storage
        return {
            // For User Model (Encrypted)
            encryptedPublicKey,
            publicKeyIV, 
            publicKeyAuthTag,
            encryptedPrivateKey,
            privateKeyIV,
            privateKeyAuthTag, 
            encryptedToken,
            tokenIV,
            tokenAuthTag,
            salt: salt.toString('hex'),
            
            // For IPFSRegistration Model (Hashed)
            tokenHash,
            publicKeyHash
        };
        
    } catch (error) {
        throw new Error(`Crypto fields generation failed: ${error.message}`);
    }
};