import { askArchie } from "../services/archieClient.js";

// POST /api/archie
export const chatWithArchie = async (req, res) => {
  try {
    const { system, messages } = req.body;

    if (!system || !Array.isArray(messages)) {
      return res
        .status(400)
        .json({ message: "system (string) and messages (array) are required" });
    }

    const text = await askArchie({ system, messages });

    // Keep the same { content: [{ text }] } shape the frontend already expects
    res.json({ content: [{ text }] });
  } catch (err) {
    console.error("Archie chat error:", err.message);
    res.status(err.status || 500).json({ error: { message: err.message } });
  }
};