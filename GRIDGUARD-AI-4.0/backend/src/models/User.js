import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "REGIONAL_MANAGER", "FIELD_ENGINEER", "ANALYST"],
      default: "ANALYST",
      index: true
    },
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
