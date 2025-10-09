import Election from "../Model/Election_Model.js";


// Create Election

export const createElection = async(req, res) =>{

    try{
        const  { eid, title, description, startDateTime, endDateTime, users, candidates, officers } = req.body;
    if(!eid || !title || !startDateTime || !endDateTime){
        return res.status(400).json({message: "Missing required fields"});
    }

    if(new Date(startDateTime) >= new Date(endDateTime)){
        return res.status(400).json({message: "Invalid Dates for Election"});
    }

    const existingElection = await Election.findOne({eid});
    if(existingElection){
        return res.status(400).json({message: "Election ID already exists"});
    }

    const now = new Date();
    const status = now < new Date(startDateTime) ? "Not Yet Started": 
                        now > new Date(endDateTime) ? "Finished" : "Active";

    const election = new Election({
        eid,
        title,
        description,
        startDateTime,
        endDateTime,
        users,
        candidates: candidates.map(candidate => ({ candidate, votesCount: 0 })),
        officers,
        status
    });

    await election.save();
    res.status(201).json({message: "Election created Successfully", election});
    }catch(error){
        console.error("Error in creating election: ", error);
        res.status(500).json({ message: "Error creating election", error: error.message });
    }
    
};




// Get all elections


export const getAllElections = async(req, res) =>{
    try{
        const {status} = req.query;
        const query = status ? {status} : {}; // done so that if the elections are done or upcoming.
        const elections = await Election.find(query)
            .populate("users", "name email")
            .populate("candidates.candidate", "name")
            .populate("officers", "name email")
            .sort({createdAt: -1});
        const total = await Election.countDocuments(query);

        res.status(200).json({ elections, total });
    }catch(error){
        res.status(500).json({messaage: "Error occured fetching all elections"});
    }
};


// Get election by ID

export const getElectionById = async(req, res) =>{
    try{
        const {id} = req.params;

        const election = await Election.findOne({eid: id})
            .populate("users", "name email")
            .populate("candidates.candidate", "name")
            .populate("officers", "name email");

        if(!election){
            return res.status(404).json({message: "Election not found"});
        }
        res.status(200).json(election);
    }catch(error){
        res.status(500).json({message: "Error occured while fetching election"});
    }
};


// Update election

export const updateElection = async(req, res) =>{
    try{
         const {id} = req.params;
        const {title, description, startDateTime, endDateTime, users, candidates, officers} = req.body;
        const election = await Election.findOne({eid: id});
        if(!election){
            return res.status(404).json({message: "Election NOT Found"});
        }
        if(election.status !== "Not Yet Started"){
            return res.status(400).json({message: "Cannot update active or finished election"});
        }

        if (title) election.title = title;
        if (description) election.description = description;

        // Recompute and validate the new start/end dates before assignment
        const nextStartDateTime = startDateTime ?? election.startDateTime;
        const nextEndDateTime   = endDateTime   ?? election.endDateTime;

        if (new Date(nextStartDateTime) >= new Date(nextEndDateTime)) {
            return res.status(400).json({ message: "Invalid Dates for Election" });
        }

        election.startDateTime = nextStartDateTime;
        election.endDateTime   = nextEndDateTime;

        if (users)      election.users      = users;
        if (candidates) election.candidates = candidates.map(candidate => ({ candidate, votesCount: 0 }));
        if (officers)   election.officers   = officers;


        const now = new Date();
        election.status = now < new Date(election.startDateTime)   ? "Not Yet Started"
                         : now > new Date(election.endDateTime) ? "Finished"
                                                                 : "Active";

        await election.save();
        res.status(200).json({message: "Election updated Successfully", election});
    }catch(error){
        res.status(500).json({message: "Error occured while Updating election"});
    }
};


// Delete Election

export const deleteElection = async (req, res) =>{
    try{
        const {id} = req.params;
        const election = await Election.findOne({eid: id});
        if (!election) {
            return res.status(404).json({ message: "Election not found" });
        }

        // Optional: Restrict deletion for active or finished elections
        if (election.status !== "Not Yet Started") {
            return res.status(400).json({ message: "Cannot delete active or finished election" });
        }

        await election.deleteOne();
        res.status(200).json({ message: "Election deleted successfully" });

        }catch(error){
            res.status(500).json({message: "Error occured while deleting Election"});
    }
    
};

export const getElectionResults = async (req, res) => {
    try{
        const { id } = req.params;

    const election = await Election.findOne({ eid: id })
        .populate("candidates.candidate", "name");

    if (!election) {
        return res.status(404).json({ message: "Election not found" });
    }

    if (election.status !== "Finished") {
        return res.status(400).json({ message: "Election results not available yet" });
    }

    res.status(200).json({
        election: election.title,
        results: election.candidates.map(c => ({
            candidate: c.candidate?.name ?? "Unknown Candidate",
            votes: c.votesCount
        }))
    });

    }catch(error){
        res.status(500).json({message: "Error occured while fetching Election Results"});
    }
    
};

export const updateElectionStatus = async (req, res) => {
    try{
        const { id } = req.params;

    const election = await Election.findOne({ eid: id });
    if (!election) {
        return res.status(404).json({ message: "Election not found" });
    }

    const now = new Date();
    election.status = now < new Date(election.startDateTime) ? "Not Yet Started" :
                      now > new Date(election.endDateTime) ? "Finished" : "Active";

    await election.save();
    res.status(200).json({ message: "Election status updated", status: election.status });
    }catch(error){
         res.status(500).json({message: "Error occured while Updating Election Status"});
    }
    
};