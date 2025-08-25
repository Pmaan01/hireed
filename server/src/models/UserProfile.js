import mongoose from "mongoose";

const UserProfileSchema = new mongoose.Schema(
  {
    credits: [String],
    skills: [String],
    city: String,
    role: String
  },
  { timestamps: true }
);

export default mongoose.model("UserProfile", UserProfileSchema);
