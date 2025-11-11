import { prepareEncryptedVote } from "../Utils/voteEncryptionUtil";

export const castVote = async(req, res)=>{
    try{
        const {
            candidateID,
            voterPublicKey,
            voterPrivateKeyComponents,
            electionCommissionPublicKey,
            token,
        } = req.body;

        const encryptedVoteData = await prepareEncryptedVote({
            candidateID,
            voterPublicKey,
            voterPrivateKeyComponents,
            electionCommissionPublicKey,
            token,
        });

        res.status(200).json({
            success: true,
            data: encryptedVoteData,
        });
    }catch(err){

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

//================ Maama!! Vote Encryption and payload setting ayipoyindhi! ================//

