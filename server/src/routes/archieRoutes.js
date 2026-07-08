import express from "express";
import { chatWithArchie } from "../controllers/archieController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Require login so the shared GROQ_API_KEY quota isn't open to anonymous abuse
router.post("/", protect, chatWithArchie);

export default router;