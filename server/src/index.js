import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Verify env is loaded
console.log("✅ ML_SERVICE_URL:", process.env.ML_SERVICE_URL);
console.log("✅ PORT:", process.env.PORT);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "BuildMate AI server is running" });
});

// ML Layout Generation
app.post("/api/layouts/generate", async (req, res) => {
  try {
    const brief = req.body;
    
    const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    
    const response = await fetch(`${mlServiceUrl}/generate-variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brief),
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`ML service error: ${response.statusText}`);
    }
    
    const layouts = await response.json();
    res.json({ status: "success", layouts });
  } catch (error) {
    console.error("Layout generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
};

start();