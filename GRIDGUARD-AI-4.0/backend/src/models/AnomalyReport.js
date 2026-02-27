import mongoose from "mongoose";

const AnomalyReportSchema = new mongoose.Schema(
  {
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region", index: true },
    transformer: { type: mongoose.Schema.Types.ObjectId, ref: "Transformer" },
    meter: { type: mongoose.Schema.Types.ObjectId, ref: "SmartMeter" },
    score: { type: Number, required: true },
    theftProbability: { type: Number, required: true },
    riskCategory: { type: String, enum: ["GREEN", "YELLOW", "RED"], index: true },
    explanation: { type: String },
    modelVersion: { type: String, default: "v1" }
  },
  { timestamps: true }
);

AnomalyReportSchema.index({ createdAt: -1, region: 1 });

export default mongoose.model("AnomalyReport", AnomalyReportSchema);
