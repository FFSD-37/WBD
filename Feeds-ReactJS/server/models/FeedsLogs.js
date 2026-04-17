import mongoose from "mongoose";

const LogsSchema = new mongoose.Schema(
  {
    method: String,
    url: String,
    status: Number,
    responseTime: Number,
    ip: String,
    userAgent: String,
  },
  { timestamps: true, collection: "logs" }
);

export const Logs = mongoose.model("Logs", LogsSchema);
