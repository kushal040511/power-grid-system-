import mongoose from "mongoose";

const TransformerSchema = new mongoose.Schema(
  {
    transformerId: { type: String, required: true, unique: true, index: true },
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region", index: true },
    capacityKva: Number,
    healthIndex: { type: Number, default: 1 },
    overloadRisk: { type: Number, default: 0 },
    overheatingRisk: { type: Number, default: 0 },
    latitude: Number,
    longitude: Number,
    status: { type: String, enum: ["OK", "WARNING", "CRITICAL"], default: "OK" }
  },
  { timestamps: true }
);

export default mongoose.model("Transformer", TransformerSchema);
