import Project from "../models/Project.js";
import { generateLayoutVariantsViaML } from "../services/mlClient.js";
import { estimateCost } from "../services/costEngine.js";

const normalizeVariant = (variant, index = 0) => {
  const letter = String.fromCharCode(65 + index);
  return {
    index,
    variant: variant?.variant || letter,
    variantName: variant?.variantName || variant?.name || `Layout ${letter}`,
    generated: true,
    generatedBy: variant?.meta?.generator || variant?.generatedBy || "arch-v3",
    buildable: variant?.buildable || {},
    plot: variant?.plot || {},
    dimensions: variant?.dimensions || {},
    rooms: Array.isArray(variant?.rooms) ? variant.rooms : [],
    walls: Array.isArray(variant?.walls) ? variant.walls : [],
    openings: Array.isArray(variant?.openings) ? variant.openings : [],
    warnings: Array.isArray(variant?.warnings) ? variant.warnings : [],
    feasible: variant?.feasible !== false,
    meta: variant?.meta || {},
    elevations: variant?.elevations || {},
    roofView: variant?.roofView || {},
  };
};

const sanitize = (project) => {
  const layoutVariants = Array.isArray(project.layoutVariants)
    ? project.layoutVariants.map((v, i) => normalizeVariant(v, i))
    : [];

  const obj = {
    id: project._id,
    name: project.name,
    description: project.description,
    brief: project.brief,
    layout: project.layout?.generated
      ? normalizeVariant(project.layout, project.selectedVariantIndex || 0)
      : project.layout,
    layoutVariants,
    selectedVariantIndex: project.selectedVariantIndex || 0,
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

    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }
    if (
      !brief?.plot?.frontWidth ||
      !brief?.plot?.backWidth ||
      !brief?.plot?.leftLength ||
      !brief?.plot?.rightLength
    ) {
      return res.status(400).json({
        message:
          "All four plot dimensions (front width, back width, left length, right length) are required",
      });
    }

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
      return res.status(400).json({ message: "No rooms defined" });
    }

    const rawVariants = await generateLayoutVariantsViaML(project.brief);
    const variants = Array.isArray(rawVariants)
      ? rawVariants
      : Array.isArray(rawVariants?.variants)
        ? rawVariants.variants
        : Array.isArray(rawVariants?.layouts)
          ? rawVariants.layouts
          : [];

    if (!variants || variants.length === 0) {
      return res.status(500).json({ message: "No layouts generated" });
    }

    const normalizedVariants = variants.map((v, i) => normalizeVariant(v, i));
    const activeIndex = Math.min(
      Math.max(project.selectedVariantIndex || 0, 0),
      normalizedVariants.length - 1
    );
    const active = normalizedVariants[activeIndex];

    project.layoutVariants = normalizedVariants;
    project.selectedVariantIndex = activeIndex;
    project.layout = {
      generated: true,
      generatedAt: new Date(),
      generatedBy: active.generatedBy || "arch-v3",
      variant: active.variant,
      variantName: active.variantName,
      buildable: active.buildable,
      plot: active.plot,
      dimensions: active.dimensions,
      rooms: active.rooms,
      walls: active.walls,
      openings: active.openings,
      warnings: active.warnings || [],
      elevations: active.elevations || {},
      roofView: active.roofView || {},
      meta: active.meta || {},
    };
    project.status = "generated";

    await project.save();

    res.json({ project: sanitize(project) });
  } catch (err) {
    console.error("Generate layout error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// POST /api/projects/:id/select-layout
export const selectLayout = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const index = Number(req.body?.index);
    if (!Number.isInteger(index)) {
      return res.status(400).json({ message: "Invalid layout index" });
    }
    if (!Array.isArray(project.layoutVariants) || !project.layoutVariants[index]) {
      return res.status(400).json({ message: "Layout variant not found" });
    }

    const variant = normalizeVariant(project.layoutVariants[index], index);

    project.selectedVariantIndex = index;
    project.layout = {
      generated: true,
      generatedAt: new Date(),
      generatedBy: variant.generatedBy || "arch-v3",
      variant: variant.variant,
      variantName: variant.variantName,
      buildable: variant.buildable,
      plot: variant.plot,
      dimensions: variant.dimensions,
      rooms: variant.rooms,
      walls: variant.walls,
      openings: variant.openings,
      warnings: variant.warnings || [],
      elevations: variant.elevations || {},
      roofView: variant.roofView || {},
      meta: variant.meta || {},
    };
    project.status = "generated";

    await project.save();

    res.json({ project: sanitize(project) });
  } catch (err) {
    console.error("Select layout error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};