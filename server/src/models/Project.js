import mongoose from "mongoose";

// ════════════════════════════════════════════════════════════════
// Sub-schemas
// ════════════════════════════════════════════════════════════════

// Brief room (input from user)
const briefRoomSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "bedroom", "bathroom", "kitchen", "living", "dining",
        "drawing", "study", "garage", "store", "staircase", "other",
      ],
      required: true,
    },
    count: { type: Number, default: 1, min: 0 },
    size: {
      type: String,
      enum: ["master", "medium", "small", "default"],
      default: "default",
    },
  },
  { _id: false }
);

// Layout room (generated output)
const layoutRoomSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    sizeCategory: { type: String, default: "default" },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false }
);

const wallSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    x1: { type: Number, required: true },
    y1: { type: Number, required: true },
    x2: { type: Number, required: true },
    y2: { type: Number, required: true },
    thickness: { type: Number, default: 0.23 },
    kind: { type: String, enum: ["exterior", "interior"], default: "interior" },
  },
  { _id: false }
);

const openingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    wallId: { type: String, required: true },
    kind: { type: String, enum: ["door", "window"], required: true },
    offset: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, default: 2.1 },     // meters
    sillHeight: { type: Number, default: 0 },   // 0 for door, 0.9 for window
  },
  { _id: false }
);

// ════════════════════════════════════════════════════════════════
// Main Project Schema
// ════════════════════════════════════════════════════════════════

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: 100,
    },
    description: { type: String, trim: true, maxlength: 500, default: "" },

    // ─── BRIEF (user inputs) ─────────────────────────────────────
    brief: {
      buildingType: {
        type: String,
        enum: ["house", "apartment", "office", "shop"],
        default: "house",
      },

      // Irregular plot — 4 separate sides
      plot: {
        frontWidth:  { type: Number, required: true, min: 3, max: 200 },
        backWidth:   { type: Number, required: true, min: 3, max: 200 },
        leftLength:  { type: Number, required: true, min: 3, max: 200 },
        rightLength: { type: Number, required: true, min: 3, max: 200 },
        unit: { type: String, enum: ["feet", "meters"], default: "feet" },
      },

      // Setbacks (in same unit as plot)
      setbacks: {
        front: { type: Number, default: 4, min: 0 },
        back:  { type: Number, default: 2, min: 0 },
        left:  { type: Number, default: 1, min: 0 },
        right: { type: Number, default: 1, min: 0 },
      },

      floors: { type: Number, default: 1, min: 1, max: 5 },

      // Rooms list (each with size category)
      rooms: { type: [briefRoomSchema], default: [] },

      // Kitchen + drawing room style
      kitchenType: { type: String, enum: ["open", "closed"], default: "closed" },
      drawingRoomType: { type: String, enum: ["open", "closed", "none"], default: "closed" },

      // Staircase
      hasStaircase: { type: Boolean, default: false },
      staircaseType: {
        type: String,
        enum: ["straight", "L-shape", "U-shape", "none"],
        default: "none",
      },

      // Has garage / store
      hasGarage: { type: Boolean, default: false },
      hasStoreRoom: { type: Boolean, default: false },

      // Location preference order — defines room placement priority
      locationPreferences: {
        type: [String],
        default: ["bedrooms", "kitchen", "living", "dining", "drawing", "stairs", "garage"],
      },

      // Connectivity / adjacency rules
      connectivity: {
        kitchenDining: {
          type: String,
          enum: ["connected", "separate"],
          default: "connected",
        },
        bathroom: {
          type: String,
          enum: ["attached", "common", "mixed"],
          default: "mixed",
        },
        drawingRoom: {
          type: String,
          enum: ["separate-entrance", "connected-to-lounge", "none"],
          default: "connected-to-lounge",
        },
        bedroomNear: {
          type: String,
          enum: ["kitchen", "living-room", "any"],
          default: "any",
        },
      },

      // Technical specs
      technical: {
        floorHeight:    { type: Number, default: 10, min: 8, max: 15 },     // feet
        wallThicknessExt: { type: Number, default: 9, min: 4.5, max: 18 },  // inches
        wallThicknessInt: { type: Number, default: 4.5, min: 3, max: 9 },   // inches
        columnGrid: {
          type: String,
          enum: ["10ft", "12ft", "15ft", "auto"],
          default: "auto",
        },
      },

      // Optional natural-language description (for FYP report — not parsed yet)
      description: { type: String, default: "" },
    },

    // ─── LAYOUT (generated output) ───────────────────────────────
    layout: {
      generated: { type: Boolean, default: false },
      generatedAt: { type: Date, default: null },
      generatedBy: { type: String, default: null },

      // Buildable area (after setbacks)
      buildable: {
        width: { type: Number, default: null },
        length: { type: Number, default: null },
        offsetX: { type: Number, default: null },  // distance from plot origin
        offsetY: { type: Number, default: null },
      },

      // Plot outline (4 corners, in meters internally)
      plot: {
        unit: { type: String, default: "m" },
        corners: { type: [[Number]], default: [] },  // [[x,y], [x,y], [x,y], [x,y]]
      },

      rooms: { type: [layoutRoomSchema], default: [] },
      walls: { type: [wallSchema], default: [] },
      openings: { type: [openingSchema], default: [] },

      // Warnings from the generator (if any)
      warnings: { type: [String], default: [] },
    },

    status: {
      type: String,
      enum: ["draft", "generated", "edited", "finalized"],
      default: "draft",
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);
export default Project;