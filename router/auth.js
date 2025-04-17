const express = require("express");
const router = new express.Router();
const {
  registerUser,
  loginUser,
  loginUserMeta,
} = require("../controller/authController");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

//signup
router.post("/register", registerUser);
//login
router.post("/login", loginUser);
//login meta
router.post("/loginMeta", loginUserMeta);

module.exports = router;

