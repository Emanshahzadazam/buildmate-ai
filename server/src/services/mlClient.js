import axios from "axios";
const ML_BASE = process.env.ML_SERVICE_URL || "http://localhost:8000";

export const generateLayoutVariantsViaML = async (brief) => {
  const payload = {
    plot: brief.plot,
    setbacks: brief.setbacks,
    floors: brief.floors || 1,
    rooms: (brief.rooms || []).map((r) => ({
      type: r.type,
      count: r.count,
      size: r.size || "default",
    })),
    kitchenType: brief.kitchenType || "closed",
    drawingRoomType: brief.drawingRoomType || "closed",
    hasStaircase: brief.hasStaircase || false,
    staircaseType: brief.staircaseType || "none",
    hasGarage: brief.hasGarage || false,
    hasStoreRoom: brief.hasStoreRoom || false,
    connectivity: brief.connectivity || {},
    technical: brief.technical || {},
  };

  try {
    console.log("🔄 Sending to ML:", ML_BASE);
    console.log("📦 Payload:", payload);
    
    const { data } = await axios.post(
      `${ML_BASE}/generate-variants`,
      payload,
      { timeout: 30000 }
    );
    
    console.log("✅ ML Response:", data);
    return data;
  } catch (err) {
    if (err.response) {
      throw new Error(`ML error: ${err.response.data?.detail || err.response.statusText}`);
    }
    if (err.code === "ECONNREFUSED") {
      throw new Error("ML service not running. Start: uvicorn app.main:app --reload --port 8000");
    }
    throw err;
  }
};
  
export const generateLayoutViaML = async (brief) => {
  const variants = await generateLayoutVariantsViaML(brief);
  return variants[0];
};