import mongoose from "mongoose";

const adschema = new mongoose.Schema(
  {
    url: { type: String, required: true, unique: true },

    ad_url: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const Adpost = mongoose.model("Adpost", adschema);

export default Adpost;
