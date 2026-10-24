
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Applied", "Assessment", "Interview", "Offer", "Rejected"],
      default: "Applied",
    },
    jobUrl: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    interviewDate: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    resume: {
      name: { type: String, default: "" },
      data: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
