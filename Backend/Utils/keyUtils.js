// Helpers for handling PEM/base64 public keys

export const base64ToPem = (base64Key) => {
  if (typeof base64Key !== 'string') throw new Error('base64Key must be string');
  const lines = base64Key.match(/.{1,64}/g).join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
};

export const ensurePem = (maybePemOrBase64) => {
  if (typeof maybePemOrBase64 !== 'string') throw new Error('Key must be a string');
  if (maybePemOrBase64.includes('-----BEGIN')) return maybePemOrBase64;
  return base64ToPem(maybePemOrBase64);
};
