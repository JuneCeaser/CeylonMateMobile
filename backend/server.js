require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const placeRoutes = require("./routes/placeRoutes"); // Import new routes
const experienceRoutes = require("./routes/experienceRoutes");
const cors = require("cors");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: "*" })); 
app.use(express.json());

// Routes
app.get("/", (req, res) => res.send("Ceylon Mate API Running"));

// User Authentication Routes
app.use("/api/users", userRoutes);

// New Tourism/Place Routes
app.use("/api/places", placeRoutes);

// Experience Routes
app.use("/api/experiences", experienceRoutes);

// Global Error Handler 
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong on the server!" });
});

// Handle 404 Routes 
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

