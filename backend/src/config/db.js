import mongoose from "mongoose";
import { logError, logInfo } from "../utils/logger.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: "hamza",
    });
    logInfo("MongoDB connected");
  } catch (err) {
    logError("Mongo error", { error: err.message });
    process.exit(1);
  }
};
