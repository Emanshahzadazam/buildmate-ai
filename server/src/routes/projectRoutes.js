import express from "express";
import {
  listProjects,
  createProject,
  getProject,
  deleteProject,
  generateLayout,
} from "../controllers/projectController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Every project route requires authentication
router.use(protect);

router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.delete("/:id", deleteProject);
router.post("/:id/generate", generateLayout);


export default router;