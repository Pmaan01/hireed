import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema({
  title: String,
  provider: String, // "Coursera", "edX", "BCIT", etc.
  url: String,
  roleKeys: [String], // ["data-analyst"]
  coversSkills: [String], // skills this course teaches
  mode: { type: String, enum: ["transfer","bootcamp","self-paced","hybrid"], default: "self-paced" },
  hours: Number,
  cost: Number,
}, { timestamps: true });

export default mongoose.model("Course", CourseSchema);
