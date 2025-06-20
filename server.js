const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./db');
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

const authRouter = require('./router/auth');
const emergencyRouter = require('./router/emergency');
const userRoutes = require("./router/user");
const botRoutes = require("./router/bot");
const donationRoutes = require('./router/donation');
const notificationRoutes = require("./router/notification");
const incentiveRoutes = require("./router/incentive");
const errorHandler = require('./middleware/errorHandler'); // <-- Note: use default import here

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({ credentials: true }));

// Routes
app.use(authRouter);
app.use("/notifications", notificationRoutes);
app.use('/', emergencyRouter);
app.use("/users", userRoutes);
app.use("/chatbot", botRoutes);
app.use('/donation', donationRoutes);
app.use("/coins", incentiveRoutes);

// Health Check
app.get('/health-status', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.use(errorHandler);

// Connect to the database
connectDB();

// Start the server
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
