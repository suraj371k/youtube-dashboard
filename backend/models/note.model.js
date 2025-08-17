import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  videoId: String,
  text: String,
  tags: [String],
}, { timestamps: true });

export default mongoose.model("Note", noteSchema);
