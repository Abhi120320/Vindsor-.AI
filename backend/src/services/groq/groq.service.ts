import axios from "axios";
import { env } from "../../config/env";

export const askGroq = async (prompt: string, systemPrompt?: string) => {
  if (!env.GROQ_API_KEY) {
    return "Groq API key missing. Add GROQ_API_KEY to enable AI insights.";
  }

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: env.GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              systemPrompt ??
              "You are Vendsor .AI consultant. Provide concise practical recommendations for retail vendors.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return response.data.choices?.[0]?.message?.content ?? "No response generated.";
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.error?.message ?? error.message
      : "Unknown AI service error";
    throw new Error(`Groq request failed: ${message}`);
  }
};
