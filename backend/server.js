require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const placeRoutes = require("./routes/placeRoutes"); // Import new routes
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});