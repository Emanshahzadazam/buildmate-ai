import axios from "axios";

const ML_BASE = process.env.ML_SERVICE_URL || "http://localhost:8000";

// Safely coerce a value to float, return fallback if invalid
const f = (v, fallback = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
};

export const generateLayoutVariantsViaML = async (brief) => {
  const plot     = brief.plot     || {};
  const setbacks = brief.setbacks || {};
  const tech     = brief.technical || {};

  const payload = {
    plot: {
      frontWidth:  f(plot.frontWidth,  40),
      backWidth:   f(plot.backWidth,   40),
      leftLength:  f(plot.leftLength,  70),
      rightLength: f(plot.rightLength, 70),
      unit:        plot.unit || "feet",
    },
    setbacks: {
      front: f(setbacks.front, 4),
      back:  f(setbacks.back,  2),
      left:  f(setbacks.left,  1),
      right: f(setbacks.right, 1),
    },
    floors:          parseInt(brief.floors) || 1,
    rooms: (brief.rooms || []).map((r) => ({
      type:  r.type,
      count: parseInt(r.count) || 1,
      size:  r.size || "default",
    })),
    kitchenType:     brief.kitchenType     || "closed",
    drawingRoomType: brief.drawingRoomType || "closed",
    hasStaircase:    !!brief.hasStaircase,
    staircaseType:   brief.staircaseType   || "none",
    hasGarage:       !!brief.hasGarage,
    hasStoreRoom:    !!brief.hasStoreRoom,
    connectivity:    brief.connectivity    || {},
    technical: {
      floorHeight:      f(tech.floorHeight,      10),
      wallThicknessExt: f(tech.wallThicknessExt, 0.75),
      wallThicknessInt: f(tech.wallThicknessInt, 0.375),
      columnGrid:       tech.columnGrid || "auto",
    },
  };

  try {
    const { data } = await axios.post(
      `${ML_BASE}/generate-variants`,
      payload,
      { timeout: 30000 }
    );

    if (Array.isArray(data))           return data;
    if (Array.isArray(data?.variants)) return data.variants;
    if (Array.isArray(data?.layouts))  return data.layouts;
    return [];
  } catch (err) {
    if (err.response) {
      const detail = err.response.data?.detail || err.response.data?.message || err.response.statusText;
      throw new Error(`ML service error: ${JSON.stringify(detail)}`);
    }
    if (err.code === "ECONNREFUSED") {
      throw new Error("ML service not running. Start with: uvicorn app.main:app --reload --port 8000");
    }
    throw err;
  }
};

export const generateLayoutViaML = async (brief) => {
  const variants = await generateLayoutVariantsViaML(brief);
  return variants[0];
};