import crypto from 'crypto';

// Convert ObjectId hex (24 chars) to BigInt
export const objectIdHexToBigInt = (hexStr) => {
  if (typeof hexStr !== 'string') throw new Error('hex string required');
  // allow optional 0x prefix
  const clean = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
  if (!/^[0-9a-fA-F]{24}$/.test(clean)) {
    // permit longer hex as well, but warn
    if (!/^[0-9a-fA-F]+$/.test(clean)) throw new Error('Invalid hex string for ObjectId');
  }
  return BigInt('0x' + clean);
};

// Convert BigInt back to ObjectId hex string (24 hex chars padded)
export const bigIntToObjectIdHex = (bigInt) => {
  if (typeof bigInt !== 'bigint') throw new Error('bigint required');
  let hex = bigInt.toString(16);
  // pad to 24 hex chars (12 bytes) if shorter
  if (hex.length < 24) hex = hex.padStart(24, '0');
  return hex.toLowerCase();
};

// Generate cryptographic random BigInt of given byte length
export const randomBigIntBytes = (byteLength = 16) => {
  const buff = crypto.randomBytes(byteLength);
  return BigInt('0x' + buff.toString('hex'));
};

// Mask two BigInts with XOR
export const maskBigInt = (idBigInt, randBigInt) => {
  if (typeof idBigInt !== 'bigint' || typeof randBigInt !== 'bigint') {
    throw new Error('bigint required for masking');
  }
  return idBigInt ^ randBigInt;
};
