import mongoose from "mongoose";
import { isMockMode } from "../data/mockStore.js";

export const connectDb = async (mongoUri) => {
  if (isMockMode()) return null;
  if (!mongoUri) throw new Error("MONGO_URI missing");
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    autoIndex: true
  });
  return mongoose.connection;
};
