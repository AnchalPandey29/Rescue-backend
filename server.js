const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./db');
const cloudinary = require("cloudinary").v2;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
const errorHandler = require('./middleware/errorHandler');

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Middleware
app.use(helmet()); // Add helmet for security headers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({ credentials: true }));

// Routes
app.use('/', authLimiter, authRouter); // Apply rate limiter only to auth routes
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