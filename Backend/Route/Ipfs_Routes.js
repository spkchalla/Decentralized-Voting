const express = require('express');
const router = express.Router();
const PinataSDK = require('@pinata/sdk');
const { sendVoteToIpfs } = require('../Controller/ipfsController');
const pinata = new PinataSDK({pinataJWTKey: process.env.PINATA_JWT});

// I need to import the file from controller for the ipfs controller code.


router.post('register', registerVoter);
router.post('/vote', sendVoteToIpfs);