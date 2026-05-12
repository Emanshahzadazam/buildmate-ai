import { generateLayoutViaML } from "../services/mlClient.js";
import Project from "../models/Project.js";
import { generateStubLayout } from "../services/stubGenerator.js";
import { estimateCost } from "../services/costEngine.js";

const sanitize = (project) => {
  const obj = {
    id: project._id,
    name: project.name,
    description: project.description,
    brief: project.brief,
    layout: project.layout,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  if (project.layout?.generated) {
    obj.cost = estimateCost(project.layout);
  }
  return obj;
};

// GET /api/projects — list current user's projects
export const listProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ projects: projects.map(sanitize) });
  } catch (err) {
    console.error("List projects error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/projects — create a new project
export const createProject = async (req, res) => {
  try {
    const { name, description, brief } = req.body;

    // Basic validation
    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }
    if (!brief?.plot?.frontWidth || !brief?.plot?.backWidth ||
        !brief?.plot?.leftLength || !brief?.plot?.rightLength) {
      return res.status(400).json({
        message: "All four plot dimensions (front width, back width, left length, right length) are required",
      });
    }

    // Create with full brief — Mongoose will validate enums and ranges
    const project = await Project.create({
      owner: req.user._id,
      name,
      description: description || "",
      brief,
    });

    res.status(201).json({ project: sanitize(project) });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    console.error("Create project error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/projects/:id
export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json({ project: sanitize(project) });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    console.error("Get project error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/projects/:id
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await project.deleteOne();
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/projects/:id/generate
export const generateLayout = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!project.brief?.rooms?.length) {
      return res.status(400).json({ message: "Project has no rooms to generate" });
    }

    const layoutData = await generateLayoutViaML(project.brief);

    project.layout = {
      generated: true,
      generatedAt: new Date(),
      generatedBy: layoutData.meta.generator,
      plot: layoutData.plot,
      rooms: layoutData.rooms,
      walls: layoutData.walls,
      openings: layoutData.openings,
    };
    project.status = "generated";
    await project.save();

    res.json({ project: sanitize(project) });
  } catch (err) {
    console.error("Generate layout error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};