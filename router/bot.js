const express = require("express");
const router = express.Router();
const processMessage = require('../controller/botController');

router.post("/bot", processMessage);

module.exports = router;