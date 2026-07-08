import express from "express";
import {
  listProjects,
  createProject,
  getProject,
  deleteProject,
  generateLayout,
  selectLayout,
} from "../controllers/projectController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.delete("/:id", deleteProject);
router.post("/:id/generate", generateLayout);
router.post("/:id/select-layout", selectLayout);

export default router;