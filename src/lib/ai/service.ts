import { callGemini, callGeminiWithImage } from "./gemini";
import { callClaude } from "./anthropic";
import { generateImage } from "./image-gen";

export interface AICallResult<T> {
  data: T;
  tokensInput: number;
  tokensOutput: number;
  durationMs: number;
  model: string;
}

/**
 * Unified AI Service - wraps all AI calls with timing, parsing, and cost tracking.
 */
export class AIService {
  /**
   * Generate Brand DNA from store scrape data (Stage 2)
   */
  static async generateBrandDNA(
    prompt: string,
    model = "gemini-2.5-pro"
  ): Promise<AICallResult<Record<string, unknown>>> {
    const start = Date.now();
    const response = await callGemini(prompt, { model, responseFormat: "json" });
    const durationMs = Date.now() - start;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(response.text);
    } catch {
      // Try to extract JSON from the response
      const match = response.text.match(/\{[\s\S]*\}/);
      if (match) {
        data = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse Brand DNA response as JSON");
      }
    }

    return {
      data,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      durationMs,
      model,
    };
  }

  /**
   * Analyze a single ad image (Stage 4)
   */
  static async analyzeAd(
    prompt: string,
    imageBase64: string,
    mimeType = "image/jpeg",
    model = "gemini-2.5-flash"
  ): Promise<AICallResult<Record<string, unknown>>> {
    const start = Date.now();
    const response = await callGeminiWithImage(prompt, imageBase64, mimeType, {
      model,
      responseFormat: "json",
    });
    const durationMs = Date.now() - start;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(response.text);
    } catch {
      const match = response.text.match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : {};
    }

    return {
      data,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      durationMs,
      model,
    };
  }

  /**
   * Generate intelligence report (Stage 5)
   */
  static async generateIntelligenceReport(
    prompt: string,
    model = "gemini-2.5-pro"
  ): Promise<AICallResult<Record<string, unknown>>> {
    const start = Date.now();
    const response = await callGemini(prompt, { model, responseFormat: "json" });
    const durationMs = Date.now() - start;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(response.text);
    } catch {
      const match = response.text.match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : {};
    }

    return { data, tokensInput: response.tokensInput, tokensOutput: response.tokensOutput, durationMs, model };
  }

  /**
   * Generate ad concepts with prompts (Stage 6)
   */
  static async generateAdConcepts(
    prompt: string,
    model = "claude-sonnet"
  ): Promise<AICallResult<Record<string, unknown>>> {
    const start = Date.now();
    const response = await callClaude(prompt, {
      systemPrompt:
        "You are an expert ad creative strategist. Respond with valid JSON only.",
    });
    const durationMs = Date.now() - start;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(response.text);
    } catch {
      const match = response.text.match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : {};
    }

    return { data, tokensInput: response.tokensInput, tokensOutput: response.tokensOutput, durationMs, model };
  }

  /**
   * Generate an image (Stage 7)
   */
  static async generateImage(
    prompt: string,
    options: { model?: string; width?: number; height?: number; seed?: number } = {}
  ) {
    const start = Date.now();
    const result = await generateImage(prompt, options);
    const durationMs = Date.now() - start;

    return {
      ...result,
      durationMs,
      model: options.model || "nano-banana-pro",
    };
  }
}
