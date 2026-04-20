import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoPassword = process.env.MONGOPASS || process.env.MONGO_PASS;
    const mongoUri =
      process.env.MONGO_URI ||
      (mongoPassword
        ? `mongodb+srv://ffsdteam37:${mongoPassword}@cluster0.hlq20.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
        : undefined);

    if (!mongoUri) {
      throw new Error("Missing MongoDB URI. Set MONGO_URI, MONGO_PASS, or MONGOPASS");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};
