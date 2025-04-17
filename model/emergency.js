const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // References the User model
    required: true, // Make it required to ensure every report is tied to a user
  },
  type: {
    type: String,
    required: true,
    enum: ["Fire", "Flood", "Earthquake", "Accident", "Medical Emergency", "Crime", "Other"],
  },
  customType: {
    type: String,
    default: "",
  },
  severity: {
    type: String,
    required: true,
    enum: ["Critical", "High", "Medium", "Low"],
  },
  description: {
    type: String,
    required: true,
  },
  location: { type: String, required: true }, // Changed to a simple string
  time: {
    type: Date,
    required: true,
    default: Date.now,
  },
  tags: {
    type: [String],
    default: [],
  },
  emergencyNeeds: {
    medicalAid: { type: Boolean, default: false },
    food: { type: Boolean, default: false },
    shelter: { type: Boolean, default: false },
    clothes: { type: Boolean, default: false },
    dailyEssentials: { type: Boolean, default: false },
    rescueTeam: { type: Boolean, default: false },
    firefighters: { type: Boolean, default: false },
    ambulance: { type: Boolean, default: false },
    lawEnforcement: { type: Boolean, default: false },
  },
  contact: {
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
  },
  emergencyContact: {
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    relationship: { type: String, default: "" },
  },
  media: [
    {
      fileName: String,
      fileType: String,
      fileUrl: String,
    },
  ],
  priority: {
    type: String,
    enum: ["Highest", "High", "Normal"],
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

  volunteers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["Assigned", "Completed"], default: "Assigned" },
    assignedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  }],
  victimApproval: { type: Boolean, default: false },
  history: [{
    action: String, // e.g., "Assigned", "Completed", "Approved"
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
  }],

});

emergencySchema.index({ location: "2dsphere" }); // For geospatial queries


const Emergency = mongoose.model("Emergency", emergencySchema);
module.exports = Emergency;