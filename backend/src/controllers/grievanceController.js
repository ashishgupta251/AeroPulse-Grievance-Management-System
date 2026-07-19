import Grievance from "../models/Grievance.js";

export async function getAllGrievances(req, res) {
  try {
    const grievances = await Grievance.find().sort({ createdAt: -1 });
    res.status(200).json(grievances);
  } catch (error) {
    console.log("Error in getAllGrievances controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createGrievance(req, res) {
  try {
    const {
      organizationName,
      complainingUnit,
      logExtract,
      status,
      remarks,
    } = req.body;
    const grievance = new Grievance({
      organizationName,
      complainingUnit,
      logExtract,
      status,
      remarks: remarks || "",
    });
    const saved = await grievance.save();
    res.status(201).json(saved);
  } catch (error) {
    console.log("Error in createGrievance controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateGrievance(req, res) {
  try {
    const {
      organizationName,
      complainingUnit,
      logExtract,
      status,
      remarks,
    } = req.body;
    const updated = await Grievance.findByIdAndUpdate(
      req.params.id,
      {
        organizationName,
        complainingUnit,
        logExtract,
        status,
        remarks: remarks || "",
      },
      { new: true },
    );
    if (!updated)
      return res.status(404).json({ message: "Grievance not found" });
    res.status(200).json(updated);
  } catch (error) {
    console.log("Error in updateGrievance controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteGrievance(req, res) {
  try {
    const deleted = await Grievance.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Grievance not found" });
    res.status(200).json({ message: "Grievance deleted successfully" });
  } catch (error) {
    console.log("Error in deleteGrievance controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
