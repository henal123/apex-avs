import { withRetry } from "./retry";

interface ImageGenResponse {
  imageBase64: string;
  mimeType: string;
}

interface ImageGenOptions {
  model?: string;
  width?: number;
  height?: number;
  seed?: number;
}

export async function generateImage(
  prompt: string,
  options: ImageGenOptions = {}
): Promise<ImageGenResponse> {
  const {
    model = "nano-banana-pro",
    width = 1024,
    height = 1024,
    seed,
  } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  return withRetry(
    async () => {
      // Use Gemini's image generation endpoint
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

      const body = {
        contents: [
          {
            parts: [
              {
                text: `Generate an image based on the following prompt. Model: ${model}. Dimensions: ${width}x${height}. ${seed ? `Seed: ${seed}.` : ""}\n\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageDimensions: { width, height },
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Image generation failed (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];

      // Find image part
      const imagePart = parts.find(
        (p: { inlineData?: { mimeType: string; data: string } }) =>
          p.inlineData?.mimeType?.startsWith("image/")
      );

      if (!imagePart?.inlineData) {
        throw new Error("No image generated in response");
      }

      return {
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
      };
    },
    { maxRetries: 1 }
  );
}
