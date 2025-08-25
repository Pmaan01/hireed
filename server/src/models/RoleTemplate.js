import mongoose from "mongoose";

const RoleTemplateSchema = new mongoose.Schema({
  key: { type: String, unique: true, index: true }, // e.g., "data-analyst"
  name: String, // "Data Analyst"
  coreSkills: [String], // ["Python","SQL","Tableau","Statistics","Excel"]
  projects: [{ id: String, title: String }]
}, { timestamps: true });

export default mongoose.model("RoleTemplate", RoleTemplateSchema);
