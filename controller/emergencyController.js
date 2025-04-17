const mongoose = require("mongoose");
const Emergency = require("../model/emergency");
const User = require("../model/user");
const { createNotification } = require("./notificationController");

// 📌 Report a new incident
exports.reportIncident = async (req, res) => {
  try {
    const { type, description, latitude, longitude, reportedBy } = req.body;

    const newIncident = new Emergency({
      type,
      description,
      location: { coordinates: [longitude, latitude] },
      reportedBy
    });

    await newIncident.save();
    res.status(201).json({ success: true, message: "Incident reported successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

exports.getReport = async (req, res) => {
  try {
    // Fetch only emergencies with status "Pending Approval" and populate reportedBy
    const emergencies = await Emergency.find({ status: "Pending" })
      .populate("reportedBy", "name email contact");

    res.json(emergencies);
  } catch (error) {
    console.error("Error fetching emergencies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find()
      .populate("reportedBy", "name")
      .select("type location severity status");
    res.json(emergencies);
  } catch (error) {
    console.error("Error fetching all emergencies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//reports of logged in users
exports.getUserReportedEmergencies = async (req, res) => {
  const userId = req.user._id; // or req.user.id if your token uses "id"
  try {
    console.log('here');

    const emergencies = await Emergency.find({ reportedBy: userId })
      .populate("reportedBy", "name email contact")
      .populate("volunteers.userId", "name email contact")
      .populate("history.userId", "name");

    res.json(emergencies);
  } catch (error) {
    console.error("Error fetching user-reported emergencies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.createReport = async (req, res) => {
  try {
    const {
      reportedBy,
      type,
      customType,
      severity,
      description,
      location,
      time,
      tags,
      emergencyNeeds,
      contact,
      emergencyContact,
      priority,
    } = req.body;

    // Upload media files to Cloudinary
    const mediaFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          {
            resource_type: "auto",
          }
        );
        mediaFiles.push({
          fileName: file.originalname,
          fileType: file.mimetype,
          fileUrl: result.secure_url,
        });
      }
    }

    // Create new emergency report
    const emergency = new Emergency({
      reportedBy,
      type,
      customType,
      severity,
      description,
      location, // Treated as a string
      time,
      tags: tags ? JSON.parse(tags) : [],
      emergencyNeeds: JSON.parse(emergencyNeeds),
      contact: JSON.parse(contact),
      emergencyContact: JSON.parse(emergencyContact),
      media: mediaFiles,
      priority,
      status: "Pending",
    });

    // Save to database
    await emergency.save();

    res.status(201).json({ message: "Emergency report submitted successfully", emergency });
  } catch (error) {
    console.error("Error submitting emergency report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all active emergencies with filters and sorting
exports.getActiveEmergencies = async (req, res) => {
  try {
    const { location, type, severity, resources, sortBy } = req.query;
    let query = { status: { $in: ["Pending", "In Progress"] } };
    if (location) query.location = { $regex: location, $options: "i" };
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (resources) {
      const resourceArray = resources.split(",");
      resourceArray.forEach((resource) => {
        query[`emergencyNeeds.${resource}`] = true;
      });
    }

    const sortOptions = {};
    if (sortBy === "severity") sortOptions.severity = -1;
    else if (sortBy === "type") sortOptions.type = 1;
    else if (sortBy === "time") sortOptions.time = -1;

    const emergencies = await Emergency.find(query)
      .sort(sortOptions)
      .populate("reportedBy", "name email contact")
      .populate("volunteers.userId", "name email contact");

    res.status(200).json(emergencies);
  } catch (error) {
    console.error("Error fetching active emergencies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Volunteer for an emergency
exports.volunteerForEmergency = async (req, res) => {
  const { emergencyId } = req.params;
  const userId = req.user._id;

  try {
    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) return res.status(404).json({ message: "Emergency not found" });
    if (emergency.status !== "Pending") return res.status(400).json({ message: "Emergency already in progress or completed" });

    emergency.status = "In Progress";
    emergency.volunteers.push({ userId });
    emergency.history.push({ action: "Volunteered", userId });
    await emergency.save();

    await User.findByIdAndUpdate(userId, {
      $push: { contributions: { emergencyId, role: "Volunteer" } },
    });

    // Notify the reporter
    const volunteer = await User.findById(userId).select("name");
    const message = `${volunteer.name} has been assigned to help with your emergency.`;
    await createNotification(emergency.reportedBy, message);

    res.json({ message: "Successfully volunteered", emergency });
  } catch (error) {
    console.error("Error volunteering:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update volunteer status
exports.updateVolunteerStatus = async (req, res) => {
  const { emergencyId } = req.params;
  const { status } = req.body;
  const userId = req.user._id;

  try {
    const emergency = await Emergency.findById(emergencyId);
    const volunteer = emergency.volunteers.find(v => v.userId.toString() === userId.toString());
    if (!volunteer) return res.status(403).json({ message: "Not volunteered for this emergency" });

    volunteer.status = status;
    volunteer.updatedAt = Date.now();
    await emergency.save();
    res.json({ message: "Status updated", emergency });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark individual as rescued
exports.markRescued = async (req, res) => {
  const { emergencyId } = req.params;
  const { name } = req.body;
  const userId = req.user._id;

  try {
    const emergency = await Emergency.findById(emergencyId);
    emergency.rescuedIndividuals.push({
      id: uuidv4(),
      name,
      rescuedBy: userId,
    });
    await emergency.save();
    res.json({ message: "Individual marked as rescued", emergency });
  } catch (error) {
    console.error("Error marking rescued:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark emergency as completed by volunteer
exports.markEmergencyCompleted = async (req, res) => {
  const { emergencyId } = req.params;
  const userId = req.user._id;

  try {
    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) return res.status(404).json({ message: "Emergency not found" });

    const volunteer = emergency.volunteers.find((v) => v.userId.toString() === userId.toString());
    if (!volunteer) return res.status(403).json({ message: "You are not assigned to this emergency" });

    volunteer.status = "Completed";
    volunteer.completedAt = Date.now();
    emergency.history.push({ action: "Completed", userId });
    await emergency.save();

    // Notify the reporter
    const volunteerUser = await User.findById(userId).select("name");
    const message = `${volunteerUser.name} has completed the task for your emergency. Please review and approve.`;
    await createNotification(emergency.reportedBy, message);

    res.json({ message: "Emergency marked as completed, awaiting victim approval", emergency });
  } catch (error) {
    console.error("Error marking completed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Victim approves completion
exports.approveEmergencyCompletion = async (req, res) => {
  const { emergencyId } = req.params;
  const userId = req.user._id;

  try {
    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) return res.status(404).json({ message: "Emergency not found" });
    if (emergency.reportedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the victim can approve completion" });
    }
    if (emergency.status === "Completed") {
      return res.status(400).json({ message: "Emergency already completed" });
    }

    emergency.status = "Completed";
    emergency.victimApproval = true;
    emergency.history.push({ action: "Approved", userId });

    // Award incentives to volunteers
    const incentiveAmount = emergency.severity === "Critical" ? 50 : emergency.severity === "High" ? 30 : 20;
    for (const volunteer of emergency.volunteers) {
      await User.findByIdAndUpdate(
        volunteer.userId,
        {
          $inc: { incentives: incentiveAmount },
          $set: { "contributions.$[elem].incentivesEarned": incentiveAmount, "contributions.$[elem].completedAt": Date.now() },
        },
        { arrayFilters: [{ "elem.emergencyId": emergencyId }] }
      );

      // Notify volunteer about approval
      const approvalMessage = `The reporter has approved your help for the emergency.`;
      await createNotification(volunteer.userId, approvalMessage);

      // Notify volunteer about incentives
      const incentiveMessage = `You have been credited with ${incentiveAmount} incentives for your help.`;
      await createNotification(volunteer.userId, incentiveMessage);

    }

    await emergency.save();
    res.json({ message: "Emergency completed and incentives awarded", emergency });
  } catch (error) {
    console.error("Error approving completion:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get emergency details (for tracking)
exports.getEmergencyDetails = async (req, res) => {
  const { emergencyId } = req.params;

  try {
    console.log(emergencyId);


    if (!emergencyId || typeof emergencyId !== "string" || !mongoose.isValidObjectId(emergencyId)) {
      return res.status(400).json({ message: "Invalid emergency ID" });
    }

    const emergency = await Emergency.findById(emergencyId)
      .populate("reportedBy", "name email contact")
      .populate("volunteers.userId", "name email contact")
      .populate("history.userId", "name"); // Populate history.userId with name

    if (!emergency) return res.status(404).json({ message: "Emergency not found" });

    res.json(emergency);
  } catch (error) {
    console.error("Error fetching emergency details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user's volunteer history
exports.getVolunteerHistory = async (req, res) => {
  const userId = req.user._id; // From authMiddleware

  try {
    const user = await User.findById(userId)
      .select("contributions")
      .populate({
        path: "contributions.emergencyId",
        select: "type status",
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure contributions is always an array, even if empty
    const contributions = user.contributions || [];
    const history = contributions.map((contrib) => ({
      emergencyId: contrib.emergencyId?._id.toString() || "N/A", // Handle missing emergencyId
      type: contrib.emergencyId?.type || "Unknown",
      status: contrib.emergencyId?.status || "Unknown",
      role: contrib.role || "Volunteer",
      completedAt: contrib.completedAt || null,
      incentivesEarned: contrib.incentivesEarned || 0,
    }));

    res.status(200).json(history); // Always an array
  } catch (error) {
    console.error("Error fetching volunteer history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const activeEmergencies = await Emergency.countDocuments({ status: "Pending" });
    const resolvedEmergencies = await Emergency.countDocuments({ status: "Completed" });
    const totalContributors = await User.countDocuments();

    res.json({
      activeEmergencies,
      resolvedEmergencies,
      totalContributors,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};