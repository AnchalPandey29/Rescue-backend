const express = require("express");
const router = express.Router();
const emergencyController = require("../controller/emergencyController");
const multer = require("multer");
const authMiddleware= require("../middleware/authMiddleware")

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/emergency", upload.array("media", 5),emergencyController.createReport);
router.get("/incidents", emergencyController.getReport);

router.get("/active", emergencyController.getActiveEmergencies);
router.get("/my-reports", authMiddleware, emergencyController.getUserReportedEmergencies);
router.get("/dashboardstats", emergencyController.getDashboardStats);
router.get("/allemergencies", emergencyController.getAllEmergencies);
router.get("/volunteer/history", authMiddleware, emergencyController.getVolunteerHistory); 
router.post("/:emergencyId/volunteer", authMiddleware, emergencyController.volunteerForEmergency);
router.put("/:emergencyId/complete", authMiddleware, emergencyController.markEmergencyCompleted);
router.put("/:emergencyId/approve", authMiddleware, emergencyController.approveEmergencyCompletion);
router.get("/:emergencyId", emergencyController.getEmergencyDetails);

module.exports = router;
