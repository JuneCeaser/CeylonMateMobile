require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Import Route Files
const userRoutes = require("./routes/userRoutes");
const placeRoutes = require("./routes/placeRoutes");
const experienceRoutes = require("./routes/experienceRoutes");

const app = express();

// Database Connection
connectDB();

// Global Middlewares
app.use(cors({ origin: "*" })); 
app.use(express.json());

// Health Check
app.get("/", (req, res) => res.send("Ceylon Mate API Running Successfully"));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/experiences", experienceRoutes);

// Error Handling
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong on the server!" });
});

const PORT = process.env.PORT || 5000;

// Listen on 0.0.0.0 to allow access from mobile phone
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Network access via: http://192.168.8.195:${PORT}`);
});