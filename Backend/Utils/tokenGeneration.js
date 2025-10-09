import crypto from 'crypto';


export const generateToken = (length = 48, encoding = 'hex') =>{
    const buffer = crypto.randomBytes(length);
    return buffer.toString(encoding);
};