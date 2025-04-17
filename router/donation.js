const express = require('express');
const router = express.Router();
const { getBankDetails } = require('../controller/donationController');

router.get('/bank-details', getBankDetails);

module.exports = router;