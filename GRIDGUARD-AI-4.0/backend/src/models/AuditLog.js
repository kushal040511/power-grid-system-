import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    details: { type: Object }
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1, actor: 1 });

export default mongoose.model("AuditLog", AuditLogSchema);
