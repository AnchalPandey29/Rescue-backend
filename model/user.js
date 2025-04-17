// model/user.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "responder", "admin"],
      default: "user",
    },
    contact: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
    wallet: {
      type: String,
      trim: true,
      unique: true, // Ensure unique wallet addresses
      sparse: true, // Allows null values while enforcing uniqueness
    },
    walletBalance: { // New field for wallet balance
      type: Number,
      default: 0,
      min: 0,
    },
    incentives: {
      type: Number,
      default: 0,
      min: 0, // Ensures incentives don't go negative
    },
    contributions: [
      {
        emergencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Emergency" },
        role: String,
        completedAt: { type: Date },
        incentivesEarned: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ _id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};


const User = mongoose.model("User", userSchema);
module.exports = User;
