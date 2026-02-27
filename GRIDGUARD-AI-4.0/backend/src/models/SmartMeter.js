import mongoose from "mongoose";

const SmartMeterSchema = new mongoose.Schema(
  {
    meterId: { type: String, required: true, unique: true, index: true },
    transformer: { type: mongoose.Schema.Types.ObjectId, ref: "Transformer", index: true },
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region", index: true },
    latitude: Number,
    longitude: Number,
    customerType: { type: String, enum: ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"], default: "RESIDENTIAL" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("SmartMeter", SmartMeterSchema);
