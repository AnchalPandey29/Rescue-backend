const getBankDetails = (req, res) => {
  // Mock bank details (replace with real details in production)
  const bankDetails = {
    bankName: 'RescueChain Bank',
    accountNumber: '1234567890',
    routingNumber: '9087654321',//mobile number
    accountHolder: 'RescueChain Foundation',
  };
  res.status(200).json(bankDetails);
};

module.exports = { getBankDetails };