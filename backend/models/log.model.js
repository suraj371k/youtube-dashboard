import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  action: String,          // e.g., FETCH_VIDEO, ADD_COMMENT
  details: Object,         // extra details about action
}, { timestamps: true });

export default mongoose.model("Log", logSchema);
