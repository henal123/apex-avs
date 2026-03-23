import { withRetry } from "./retry";

interface GeminiResponse {
  text: string;
  tokensInput: number;
  tokensOutput: number;
}

interface GeminiCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json" | "text";
}

export async function callGemini(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<GeminiResponse> {
  const {
    model = "gemini-2.5-pro",
    temperature = 0.7,
    maxTokens = 8192,
    responseFormat = "json",
  } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  // Map model names to API model IDs
  const modelMap: Record<string, string> = {
    "gemini-2.5-pro": "gemini-2.5-pro",
    "gemini-2.5-flash": "gemini-2.5-flash",
  };
  const modelId = modelMap[model] || model;

  return withRetry(async () => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(responseFormat === "json" && {
          responseMimeType: "application/json",
        }),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || "";
    const usage = data.usageMetadata || {};

    return {
      text,
      tokensInput: usage.promptTokenCount || 0,
      tokensOutput: usage.candidatesTokenCount || 0,
    };
  });
}

export async function callGeminiWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string = "image/jpeg",
  options: GeminiCallOptions = {}
): Promise<GeminiResponse> {
  const {
    model = "gemini-2.5-flash",
    temperature = 0.5,
    maxTokens = 8192,
    responseFormat = "json",
  } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const modelMap: Record<string, string> = {
    "gemini-2.5-pro": "gemini-2.5-pro",
    "gemini-2.5-flash": "gemini-2.5-flash",
  };
  const modelId = modelMap[model] || model;

  return withRetry(async () => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(responseFormat === "json" && {
          responseMimeType: "application/json",
        }),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || "";
    const usage = data.usageMetadata || {};

    return {
      text,
      tokensInput: usage.promptTokenCount || 0,
      tokensOutput: usage.candidatesTokenCount || 0,
    };
  });
}
