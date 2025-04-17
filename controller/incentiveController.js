const User = require("../model/user");
const BankAccount = require("../model/bankAccount");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getCoinBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ incentives: user.incentives });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getBankDetails = async (req, res) => {
  try {
    const bankAccount = await BankAccount.findOne({ userId: req.user._id });
    if (!bankAccount) {
      return res.status(200).json(null); // Return null if no details exist
    }
    res.status(200).json({
      accountNumber: bankAccount.accountNumber,
      ifscCode: bankAccount.ifscCode,
      bankName: bankAccount.bankName,
      upiId: bankAccount.upiId,
    });
  } catch (error) {
    console.error("Error fetching bank details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.saveBankDetails = async (req, res) => {
  const { accountNumber, ifscCode, bankName, upiId } = req.body;
  try {
    let bankAccount = await BankAccount.findOne({ userId: req.user._id });
    if (bankAccount) {
      bankAccount.accountNumber = accountNumber || bankAccount.accountNumber;
      bankAccount.ifscCode = ifscCode || bankAccount.ifscCode;
      bankAccount.bankName = bankName || bankAccount.bankName;
      bankAccount.upiId = upiId || bankAccount.upiId;
    } else {
      bankAccount = new BankAccount({
        userId: req.user._id,
        accountNumber,
        ifscCode,
        bankName,
        upiId,
      });
    }
    await bankAccount.save();
    res.status(200).json({ message: "Details saved successfully" });
  } catch (error) {
    console.error("Error saving bank details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.withdrawToBank = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bankAccount = await BankAccount.findOne({ userId: req.user._id });
    if (user.incentives < 1000) {
      return res.status(400).json({ message: "Insufficient coins" });
    }
    if (!bankAccount || (!bankAccount.accountNumber && !bankAccount.upiId)) {
      return res.status(400).json({ message: "No bank or UPI details linked" });
    }

    console.dir(bankAccount);

    console.log('here after');
    
    const incentivesToDeduct = Math.floor(user.incentives / 1000) * 1000;
    
    // Razorpay payout in test mode with your test account number
    const payoutData = bankAccount.upiId
      ? {
          account_number: "2323230016925121", // Your Razorpay test account number
          amount: incentivesToDeduct * 100, // Convert to paise
          currency: "INR",
          mode: "UPI",
          purpose: "withdrawal",
          fund_account: {
            account_type: "vpa",
            vpa: {
              address: bankAccount.upiId,
            },
            contact: {
              name: user.name || "Test User",
              email: user.email || "test@example.com",
              contact: user.phone || "9876543210", // Use user phone if available
            },
          },
        }
      : {
          account_number: "2323230016925121", // Your Razorpay test account number
          amount: incentivesToDeduct * 100, // Convert to paise
          currency: "INR",
          mode: "IMPS",
          purpose: "withdrawal",
          fund_account: {
            account_type: "bank_account",
            bank_account: {
              name: user.name || "Test User",
              account_number: bankAccount.accountNumber,
              ifsc: bankAccount.ifscCode,
            },
            contact: {
              name: user.name || "Test User",
              email: user.email || "test@example.com",
              contact: user.phone || "9876543210", // Use user phone if available
            },
          },
        };


        // Verify razorpay.payouts exists before calling create
    if (!razorpay.payouts || typeof razorpay.payouts.create !== "function") {
      throw new Error("Razorpay payouts API is not available");
    }
    const payout = await razorpay.payouts.create(payoutData);
    console.log(payout);
    const amount = incentivesToDeduct / 100; // 1000 coins = 10 INR
    user.incentives -= incentivesToDeduct;
    await user.save();

    res.status(200).json({
      message: `Successfully withdrew ${amount} INR to your ${bankAccount.upiId ? "UPI ID" : "bank account"}`,
      payoutId: payout.id,
    });
  } catch (error) {
    console.error("Payout error:", error);
    res.status(500).json({ message: "Withdrawal failed", error: error.message });
  }
};

exports.getWalletDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ wallet: user.wallet || null });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.saveWalletDetails = async (req, res) => {
  const { walletAddress } = req.body;
  try {
    const user = await User.findById(req.user._id);
    user.wallet = walletAddress;
    await user.save();
    res.status(200).json({ message: "Wallet details saved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.withdrawToWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.incentives < 1000) return res.status(400).json({ message: "Insufficient coins" });
    if (!user.wallet) return res.status(400).json({ message: "Wallet not linked" });

    const incentivesToDeduct = Math.floor(user.incentives / 1000) * 1000;
    const amount = incentivesToDeduct / 100; // 1000 coins = 10 rupees
    user.incentives -= incentivesToDeduct;
    await user.save();

    // Placeholder for wallet provider API (e.g., Paytm)
    // if (provider === "Paytm") {
    //   await paytm.transfer({ to: user.wallet, amount });
    // } else if (provider === "PhonePe") {
    //   await phonepe.transfer({ to: user.wallet, amount });
    // }

    res.status(200).json({ message: `Successfully withdrew ${amount} rupees to your wallet` });
  } catch (error) {
    res.status(500).json({ message: "Withdrawal failed" });
  }
};