const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  accountNumber: { type: String, trim: true },
  ifscCode: { type: String, trim: true },
  bankName: { type: String, trim: true },
  upiId: { type: String, trim: true }, // New field for UPI ID
});

const BankAccount = mongoose.model("BankAccount", bankAccountSchema);
module.exports= BankAccount;