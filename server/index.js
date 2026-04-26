import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
import mongoose from "mongoose";

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());           // allow cross-origin requests from the React client
app.use(express.json());   // parse JSON request bodies

// Health check route — useful for confirming the server is up

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "BuildMate AI server is running" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});