import mongoose from "mongoose";

const FinancialImpactSchema = new mongoose.Schema(
  {
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region", index: true },
    period: { type: String, index: true },
    lossAmountInr: Number,
    recoveredAmountInr: Number,
    theftCases: Number
  },
  { timestamps: true }
);

FinancialImpactSchema.index({ period: 1, region: 1 }, { unique: true });

export default mongoose.model("FinancialImpact", FinancialImpactSchema);
