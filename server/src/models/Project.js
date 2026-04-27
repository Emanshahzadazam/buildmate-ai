import mongoose from "mongoose";

// Sub-schema: a single room within a project's brief or layout
const roomSchema = new mongoose.Schema(
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
    // Position and size are filled in by the layout generator (later session)
    x: { type: Number, default: null },
    y: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // we query by owner often
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: 100,
    },
    description: { type: String, trim: true, maxlength: 500, default: "" },

    // The brief — what the user asked for
    brief: {
      buildingType: {
        type: String,
        enum: ["house", "apartment", "office", "shop"],
        default: "house",
      },
      plotWidth: { type: Number, required: true, min: 3, max: 200 }, // meters
      plotLength: { type: Number, required: true, min: 3, max: 200 }, // meters
      floors: { type: Number, default: 1, min: 1, max: 5 },
      rooms: { type: [roomSchema], default: [] },
    },

    // The generated layout (filled in by ml-service later)
    layout: {
  generated: { type: Boolean, default: false },
  generatedAt: { type: Date, default: null },
  generatedBy: { type: String, default: null },

  plot: {
    width: { type: Number, default: null },
    length: { type: Number, default: null },
  },

  rooms: {
    type: [
      {
        _id: false,
        id: String,
        type: String,
        label: String,
        x: Number,
        y: Number,
        width: Number,
        height: Number,
      },
    ],
    default: [],
  },

  walls: {
    type: [
      {
        _id: false,
        id: String,
        x1: Number,
        y1: Number,
        x2: Number,
        y2: Number,
        thickness: Number,
        kind: { type: String, enum: ["exterior", "interior"] },
      },
    ],
    default: [],
  },

  openings: {
    type: [
      {
        _id: false,
        id: String,
        wallId: String,
        kind: { type: String, enum: ["door", "window"] },
        offset: Number,
        width: Number,
      },
    ],
    default: [],
  },
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