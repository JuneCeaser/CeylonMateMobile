require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Import Route Files
const userRoutes = require("./routes/userRoutes");
const placeRoutes = require("./routes/placeRoutes");
const experienceRoutes = require("./routes/experienceRoutes");

const app = express();

// Database Connection: Establish connection to MongoDB Atlas
connectDB();

// Global Middlewares
app.use(cors({ origin: "*" })); // Enable Cross-Origin Resource Sharing for mobile/web frontend
app.use(express.json()); // Middleware to parse incoming JSON payloads

// Health Check Route: To verify if the server is live
app.get("/", (req, res) => res.send("Ceylon Mate API Running Successfully"));

/**
 * Main API Routes
 */

// User Authentication & Profile Management (Signup, Login, OTP)
app.use("/api/users", userRoutes);

// Destination & Place Information Routes
app.use("/api/places", placeRoutes);

// Cultural Experience Marketplace (Add, Get, Filter Experiences)
app.use("/api/experiences", experienceRoutes);


/**
 * Error Handling Middlewares
 */

// Catch-all Middleware for 404 - Handle undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler - Catches any internal server errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong on the server!" });
});

// Server Initialization
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});