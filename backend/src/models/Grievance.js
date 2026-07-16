import mongoose from "mongoose";

const grievanceSchema = new mongoose.Schema(
  {
    organizationName: { type: String, required: true },
    complainingUnit: { type: String, required: true },
    logExtract: { type: String, required: true },
    status: { type: String, enum: ["Resolved", "Pending"], required: true },
    response: { type: String, required: false, default: "" },
    pdc: { type: Date, required: false, default: null },
    remarks: { type: String, required: false, default: "" },
  },
  { timestamps: true },
);

const Grievance = mongoose.model("Grievance", grievanceSchema);
export default Grievance;
