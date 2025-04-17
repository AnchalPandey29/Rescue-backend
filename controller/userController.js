// controller/userController.js
const User = require("../model/user");

exports.getUserProfile = async (req, res) => {
  const userId = req.user._id; // From authMiddleware

  try {
      const user = await User.findById(userId)
          .populate("contributions.emergencyId", "_id type severity location"); // Populate emergencyId with specific fields

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
  } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateUserProfile = async (req, res) => {
  const { name, email, contact, location } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (contact) user.contact = contact;
    if (location !== undefined) user.location = location;

    await user.save();
    const updatedUser = await User.findById(req.user._id)
      .select("-password -resetPasswordToken -resetPasswordExpire")
      .populate("contributions.emergencyId", "type location severity");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};