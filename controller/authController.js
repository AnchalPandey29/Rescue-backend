// controllers/authController.js
const User = require("../model/user");
require("dotenv").config();

const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, account, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const newUser = new User({
      name,
      email,
      contact: mobile,
      wallet: account,
      password,
    });
    await newUser.save();

    const token = newUser.generateAuthToken(); 
    res.status(200).json({ newUser, token });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = user.generateAuthToken();
    res.status(200).json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**need to work on modification of the wallet login for security process */
const loginUserMeta = async (req, res) => {
  try {
    const { account } = req.body;

    const user = await User.findOne({ wallet: account }); // Fixed to match field name
    if (!user) {
      return res.status(400).json({ message: "Wallet Mismatch" });
    }

    const token = user.generateAuthToken();
    res.status(200).json({ user, token });
  } catch (error) {
    console.error("MetaMask login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  loginUserMeta,
};