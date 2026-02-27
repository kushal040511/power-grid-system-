import mongoose from "mongoose";

const RegionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    type: { type: String, enum: ["NATIONAL", "STATE", "DISTRICT"], required: true, index: true },
    parentRegion: { type: mongoose.Schema.Types.ObjectId, ref: "Region" },
    code: { type: String, index: true },
    geojsonId: { type: String, index: true }
  },
  { timestamps: true }
);

RegionSchema.index({ name: 1, type: 1 }, { unique: true });

export default mongoose.model("Region", RegionSchema);
