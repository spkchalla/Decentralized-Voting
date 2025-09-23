const {generateKeyPair} = require('crypto');

const generateRSAKeyPair = async() =>{
    try {
        return await new Promise((resolve, reject)=>{
            generateKeyPair(
                'rsa',
                {
                    modulusLength: 2048,
                    publicKeyEncoding: {
                        type: 'spki',
                        format: 'pem',
                    },
                    privateKeyEncoding: {
                        type: 'pkcs8',
                        format: 'pem',
                    },
                },
                (err, publicKey, privateKey) => {
                    if(err){
                        console.error('Key Generation Error:' , err);
                        reject(err);
                    }else{
                        resolve({publicKey, privateKey});
                    }
                }
            );
        });
    }catch(error){
        console.error('RSA Key Generation Failed: ', error);
        throw new Error('Unable to generate RSA Key pair');
    }
};

module.exports = {generateRSAKeyPair};