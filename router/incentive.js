const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware"); 
const { getBankDetails, saveBankDetails, withdrawToBank, getWalletDetails, saveWalletDetails, withdrawToWallet, getCoinBalance } = require("../controller/incentiveController");


router.get("/balance", authMiddleware, getCoinBalance);
router.get("/bank-details", authMiddleware, getBankDetails);
router.post("/save-bank-details", authMiddleware, saveBankDetails);
router.post("/withdraw/bank", authMiddleware, withdrawToBank);
router.get("/wallet-details", authMiddleware, getWalletDetails);
router.post("/save-wallet-details", authMiddleware, saveWalletDetails);
router.post("/withdraw/wallet", authMiddleware, withdrawToWallet);

module.exports = router;