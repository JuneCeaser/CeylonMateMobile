require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Import Route Files
const userRoutes = require("./routes/userRoutes");
const placeRoutes = require("./routes/placeRoutes");
const experienceRoutes = require("./routes/experienceRoutes");
const bookingExperienceRoutes = require("./routes/bookingExperienceRoutes");
const aiRoutes = require("./routes/aiRoutes"); // Added: Import AI routes
const momentRoutes = require('./routes/momentRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

const app = express();

// Database Connection
connectDB();

// Global Middlewares
app.use(cors({ origin: "*" })); 
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/bookings", bookingExperienceRoutes); 
app.use("/api/ai", aiRoutes); // Updated: Use AI routes for RAG
app.use('/api/moments', momentRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Health Check
app.get("/", (req, res) => res.send("Ceylon Mate API Running Successfully"));

// Error Handling for Undefined Routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Access: http://192.168.8.195:${PORT}`);
});