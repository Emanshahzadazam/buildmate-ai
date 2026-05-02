import mongoose from "mongoose";

// Sub-schema: a room in the brief (what the user asked for)
const briefRoomSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "bedroom",
        "bathroom",
        "kitchen",
        "living",
        "dining",
        "study",
        "garage",
        "store",
        "other",
      ],
      required: true,
    },
    count: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

// Sub-schema: a room in the generated layout (with position and size)
const layoutRoomSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false }
);

// Sub-schema: a wall in the layout
const wallSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    x1: { type: Number, required: true },
    y1: { type: Number, required: true },
    x2: { type: Number, required: true },
    y2: { type: Number, required: true },
    thickness: { type: Number, default: 0.15 },
    kind: {
      type: String,
      enum: ["exterior", "interior"],
      default: "interior",
    },
  },
  { _id: false }
);

// Sub-schema: a door or window
const openingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    wallId: { type: String, required: true },
    kind: { type: String, enum: ["door", "window"], required: true },
    offset: { type: Number, required: true },
    width: { type: Number, required: true },
  },
  { _id: false }
);

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

    brief: {
      buildingType: {
        type: String,
        enum: ["house", "apartment", "office", "shop"],
        default: "house",
      },
      plotWidth: { type: Number, required: true, min: 3, max: 200 },
      plotLength: { type: Number, required: true, min: 3, max: 200 },
      floors: { type: Number, default: 1, min: 1, max: 5 },
      rooms: { type: [briefRoomSchema], default: [] },
    },

    layout: {
      generated: { type: Boolean, default: false },
      generatedAt: { type: Date, default: null },
      generatedBy: { type: String, default: null },

      plot: {
        width: { type: Number, default: null },
        length: { type: Number, default: null },
      },

      rooms: { type: [layoutRoomSchema], default: [] },
      walls: { type: [wallSchema], default: [] },
      openings: { type: [openingSchema], default: [] },
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