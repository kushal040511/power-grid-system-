import mongoose from "mongoose";

const ReadingSchema = new mongoose.Schema(
  {
    meter: { type: mongoose.Schema.Types.ObjectId, ref: "SmartMeter", index: true },
    transformer: { type: mongoose.Schema.Types.ObjectId, ref: "Transformer", index: true },
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region", index: true },
    ts: { type: Date, default: Date.now, index: true },
    voltage: Number,
    current: Number,
    powerKw: Number,
    energyKwh: Number,
    lossPct: Number,
    theftScore: Number,
    anomalyScore: Number,
    riskCategory: { type: String, enum: ["GREEN", "YELLOW", "RED"], index: true }
  },
  { timestamps: true }
);

ReadingSchema.index({ ts: -1, region: 1 });

export default mongoose.model("Reading", ReadingSchema);
