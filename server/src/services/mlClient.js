import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export const generateLayoutViaML = async (brief) => {
  try {
    const { data } = await axios.post(
      `${ML_SERVICE_URL}/generate`,
      {
        plotWidth: brief.plotWidth,
        plotLength: brief.plotLength,
        floors: brief.floors,
        buildingType: brief.buildingType,
        rooms: brief.rooms.map((r) => ({ type: r.type, count: r.count })),
      },
      { timeout: 15000 }  // 15s — generation should never take this long
    );
    return data;
  } catch (err) {
    if (err.response) {
      // ML service replied with an error
      throw new Error(`ML service error: ${err.response.data?.detail || err.response.statusText}`);
    }
    if (err.code === "ECONNREFUSED") {
      throw new Error(
        "ML service is not running. Start it with: cd ml-service && uvicorn app.main:app --reload --port 8000"
      );
    }
    throw err;
  }
};