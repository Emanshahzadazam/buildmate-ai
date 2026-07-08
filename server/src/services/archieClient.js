import axios from "axios";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Convert the frontend's Anthropic-shaped message list into Groq/OpenAI format.
// Groq's chat models are text-only, so any image/document blocks get replaced
// with a note rather than silently dropped.
const toGroqMessages = (system, messages = []) => {
  const groqMessages = [{ role: "system", content: system }];

  messages.forEach((m) => {
    if (typeof m.content === "string") {
      groqMessages.push({ role: m.role, content: m.content });
      return;
    }

    if (Array.isArray(m.content)) {
      const textParts = m.content
        .filter((block) => block.type === "text")
        .map((block) => block.text);

      const hasFiles = m.content.some(
        (block) => block.type === "image" || block.type === "document"
      );
      if (hasFiles) {
        textParts.push("[File attached — this model can't read images/PDFs directly]");
      }

      groqMessages.push({ role: m.role, content: textParts.join("\n") || "" });
      return;
    }

    groqMessages.push({ role: m.role, content: "" });
  });

  return groqMessages;
};

// system: string, messages: [{role, content}]  ->  returns reply text
export const askArchie = async ({ system, messages }) => {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error(
      "GROQ_API_KEY missing in server/.env. Add it and restart the server."
    );
    err.status = 500;
    throw err;
  }

  try {
    const { data } = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        max_tokens: 1000,
        messages: toGroqMessages(system, messages),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    return data?.choices?.[0]?.message?.content || "No response received.";
  } catch (err) {
    if (err.response) {
      const detail = err.response.data?.error?.message || err.response.statusText;
      const wrapped = new Error(`Groq API error: ${detail}`);
      wrapped.status = 400;
      throw wrapped;
    }
    throw err;
  }
};
