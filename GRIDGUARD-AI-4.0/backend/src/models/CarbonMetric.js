import mongoose from "mongoose";

const CarbonMetricSchema = new mongoose.Schema(
  {
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region", index: true },
    period: { type: String, index: true },
    carbonSavedTons: Number,
    carbonLossTons: Number,
    optimizationScore: Number
  },
  { timestamps: true }
);

CarbonMetricSchema.index({ period: 1, region: 1 }, { unique: true });

export default mongoose.model("CarbonMetric", CarbonMetricSchema);
