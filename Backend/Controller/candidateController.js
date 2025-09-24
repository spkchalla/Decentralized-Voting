import Candidate from "../Model/Candidate_Model.js"; // Adjust path as needed
import Party from "../Model/Party_Model.js"; // Adjust path as needed
import Election from "../Model/Election_Model.js"; // Adjust path as needed

// Add a new candidate with incremental candidate_id
export const addCandidate = async (req, res) => {
  try {
    const { name, party, currentElection } = req.body;

    // Validate required fields
    if (!name || !party) {
      return res.status(400).json({ message: "Name and party are required" });
    }

    // Validate party exists and is active
    const partyExists = await Party.findOne({ _id: party, status: 1 });
    if (!partyExists) {
      return res.status(404).json({ message: "Party not found or inactive" });
    }

    // Validate currentElection (if provided)
    if (currentElection && currentElection.length) {
      for (const electionId of currentElection) {
        const electionExists = await Election.findById(electionId);
        if (!electionExists) {
          return res.status(404).json({ message: `Current election ${electionId} not found` });
        }
      }
    }

    // Check if candidate name already exists
    const existingCandidate = await Candidate.findOne({ name });
    if (existingCandidate) {
      return res.status(400).json({ message: "Candidate name already exists" });
    }

    // Generate incremental candidate_id
    const latestCandidate = await Candidate.findOne().sort({ createdAt: -1 });
    let newCandidateId = "C001"; // Default if no candidates exist
    if (latestCandidate && latestCandidate.candidate_id) {
      const latestIdNumber = parseInt(latestCandidate.candidate_id.replace("C", ""), 10);
      const nextIdNumber = latestIdNumber + 1;
      newCandidateId = `C${nextIdNumber.toString().padStart(3, "0")}`;
    }

    // Create new candidate with elections as empty array
    const candidate = new Candidate({
      candidate_id: newCandidateId,
      name,
      elections: [], // Initialize as empty
      party,
      currentElection: currentElection || [],
      status: 1
    });
    await candidate.save();

    // Populate references for response
    const populatedCandidate = await Candidate.findById(candidate._id)
      .populate("party", "party_id name symbol")
      .populate("elections.election_id", "_id name")
      .populate("currentElection", "_id name");

    res.status(201).json({ message: "Candidate added successfully", candidate: populatedCandidate });
  } catch (err) {
    console.error("Error adding candidate:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Edit a candidate (candidate_id and elections are immutable)
export const editCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, party, currentElection } = req.body;

    // Validate required fields
    if (!name || !party) {
      return res.status(400).json({ message: "Name and party are required" });
    }

    // Check if candidate exists
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Validate party exists and is active
    const partyExists = await Party.findOne({ _id: party, status: 1 });
    if (!partyExists) {
      return res.status(404).json({ message: "Party not found or inactive" });
    }

    // Validate currentElection (if provided)
    if (currentElection && currentElection.length) {
      for (const electionId of currentElection) {
        const electionExists = await Election.findById(electionId);
        if (!electionExists) {
          return res.status(404).json({ message: `Current election ${electionId} not found` });
        }
      }
    }

    // Check for duplicate name (excluding current candidate)
    const existingCandidate = await Candidate.findOne({ name, _id: { $ne: id } });
    if (existingCandidate) {
      return res.status(400).json({ message: "Candidate name already exists" });
    }

    // Update candidate (candidate_id and elections remain unchanged)
    candidate.name = name;
    candidate.party = party;
    candidate.currentElection = currentElection || candidate.currentElection;
    await candidate.save();

    // Populate references for response
    const populatedCandidate = await Candidate.findById(id)
      .populate("party", "party_id name symbol")
      .populate("elections.election_id", "_id name")
      .populate("currentElection", "_id name");

    res.status(200).json({ message: "Candidate updated successfully", candidate: populatedCandidate });
  } catch (err) {
    console.error("Error editing candidate:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// View all candidates
export const viewActiveCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find({ status: 1 })
      .populate("party", "party_id name symbol")
      .populate("elections.election_id", "_id name")
      .populate("currentElection", "_id name");
    res.status(200).json({ message: "Candidates retrieved successfully", candidates });
  } catch (err) {
    console.error("Error retrieving candidates:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const viewAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find({ })
      .populate("party", "party_id name symbol")
      .populate("elections.election_id", "_id name")
      .populate("currentElection", "_id name");
    res.status(200).json({ message: "Candidates retrieved successfully", candidates });
  } catch (err) {
    console.error("Error retrieving candidates:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// View candidate by ID
export const viewCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findOne({ _id: id })
      .populate("party", "party_id name symbol")
      .populate("elections.election_id", "_id name")
      .populate("currentElection", "_id name");
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found or inactive" });
    }
    res.status(200).json({ message: "Candidate retrieved successfully", candidate });
  } catch (err) {
    console.error("Error retrieving candidate:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete (set status to 0)
export const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.status = 0;
    await candidate.save();

    res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (err) {
    console.error("Error deleting candidate:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const activeCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.status = 1;
    await candidate.save();

    res.status(200).json({ message: "Candidate Activated successfully" });
  } catch (err) {
    console.error("Error deleting candidate:", err);
    res.status(500).json({ message: "Server error" });
  }
};