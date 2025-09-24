import Party from "../Model/Party_Model.js"; // Adjust path as needed

// Add a new party
export const addParty = async (req, res) => {
  try {
    const { name, symbol } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check if party name already exists
    const existingParty = await Party.findOne({ name });
    if (existingParty) {
      return res.status(400).json({ message: "Party name already exists" });
    }

    // Fetch the latest party to determine the next party_id
    const latestParty = await Party.findOne().sort({ createdAt: -1 });
    let newPartyId = "P001"; // Default if no parties exist

    if (latestParty && latestParty.party_id) {
      const latestIdNumber = parseInt(latestParty.party_id.replace("P", ""), 10);
      const nextIdNumber = latestIdNumber + 1;
      newPartyId = `P${nextIdNumber.toString().padStart(3, "0")}`; // Format as P001, P002, etc.
    }

    // Create new party
    const party = new Party({ party_id: newPartyId, name, symbol });
    await party.save();

    res.status(201).json({ message: "Party added successfully", party });
  } catch (err) {
    console.error("Error adding party:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const editParty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, symbol } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check if party exists
    const party = await Party.findById(id);
    if (!party) {
      return res.status(404).json({ message: "Party not found" });
    }

    // Check for duplicate name (excluding current party)
    const existingParty = await Party.findOne({
      name,
      _id: { $ne: id },
    });
    if (existingParty) {
      return res.status(400).json({ message: "Party name already exists" });
    }

    // Update party (party_id remains unchanged)
    party.name = name;
    party.symbol = symbol || party.symbol;
    await party.save();

    res.status(200).json({ message: "Party updated successfully", party });
  } catch (err) {
    console.error("Error editing party:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const viewActiveParties = async (req, res) => {
  try {
    const parties = await Party.find({ status: 1 }); // Only active parties
    res.status(200).json({ message: "Parties retrieved successfully", parties });
  } catch (err) {
    console.error("Error retrieving parties:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const viewAllParties = async (req, res) => {
  try {
    const parties = await Party.find({}); // Only active parties
    res.status(200).json({ message: "Parties retrieved successfully", parties });
  } catch (err) {
    console.error("Error retrieving parties:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// View party by ID
export const viewPartyById = async (req, res) => {
  try {
    const { id } = req.params;
    const party = await Party.findOne({ _id: id });
    if (!party) {
      return res.status(404).json({ message: "Party not found or inactive" });
    }
    res.status(200).json({ message: "Party retrieved successfully", party });
  } catch (err) {
    console.error("Error retrieving party:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete (set status to 0)
export const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;
    const party = await Party.findById(id);
    if (!party) {
      return res.status(404).json({ message: "Party not found" });
    }

    party.status = 0;
    await party.save();

    res.status(200).json({ message: "Party deleted successfully" });
  } catch (err) {
    console.error("Error deleting party:", err);
    res.status(500).json({ message: "Server error" });
  }
};