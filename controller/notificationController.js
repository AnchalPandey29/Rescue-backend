// controller/notificationController.js
const Notification = require("../model/notification");

exports.createNotification = async (userId, message) => {
  try {
    const notification = new Notification({ userId, message });
    await notification.save();
    return { success: true, notification }; // Return data for internal use
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error; 
  }
};