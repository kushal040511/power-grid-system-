import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema(
  {
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], index: true },
    type: { type: String, enum: ["THEFT", "TRANSFORMER", "LOSS", "SYSTEM"], index: true },
    message: { type: String, required: true },
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region" },
    transformer: { type: mongoose.Schema.Types.ObjectId, ref: "Transformer" },
    meter: { type: mongoose.Schema.Types.ObjectId, ref: "SmartMeter" },
    status: { type: String, enum: ["OPEN", "ACKNOWLEDGED", "RESOLVED"], default: "OPEN", index: true },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

AlertSchema.index({ createdAt: -1, status: 1 });

export default mongoose.model("Alert", AlertSchema);
