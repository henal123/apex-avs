import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, errorResponse } from "@/lib/api/response";

export const maxDuration = 120;

/**
 * Generate a single image for a specific concept.
 * Used for test-generating one concept at a time before bulk image generation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id: brandId } = await params;
  const body = await request.json();
  const conceptIndex = body.concept_index; // index in the ad_concepts array
  const concept = body.concept; // the full concept object

  if (conceptIndex === undefined || !concept) {
    return errorResponse("MISSING", "concept_index and concept required");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return errorResponse("NO_KEY", "GEMINI_API_KEY not configured");

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Get store data for product images
  // Fetch ALL brand data — not just store scrape
  const { data: brand } = await supabase
    .from("brands")
    .select("store_scrape_data, brand_dna, creative_intelligence_report")
    .eq("id", brandId)
    .single();

  const scrapeData = brand?.store_scrape_data as Record<string, unknown> | null;
  const brandDNA = (brand?.brand_dna || {}) as Record<string, unknown>;
  const report = (brand?.creative_intelligence_report || {}) as Record<string, unknown>;
  const allProducts = ((scrapeData?.collections || []) as Array<{
    products: Array<{ name: string; images: string[] }>;
  }>).flatMap((c) => c.products);

  // Extract brand specifics
  const visualIdentity = (brandDNA.visual_identity || {}) as Record<string, unknown>;
  const colorPalette = (visualIdentity.color_palette || {}) as Record<string, unknown>;
  const primaryColors = (colorPalette.primary || visualIdentity.primary_colors || []) as Array<Record<string, string> | string>;
  const accentColors = (colorPalette.accent || visualIdentity.accent_colors || []) as Array<Record<string, string> | string>;
  const typography = (visualIdentity.typography || {}) as Record<string, string>;
  const winningPatterns = (report.winning_creative_patterns || []) as unknown[];
  const failurePatterns = (report.failure_patterns || []) as unknown[];
  const storeName = (scrapeData?.store_name as string) || "";

  try {
    // Build image generation parts
    const parts: Array<Record<string, unknown>> = [];

    const textOverlays = (concept.text_overlays || [])
      .map((t: Record<string, string>) => `  ${t.type.toUpperCase()}: "${t.text}" — position: ${t.position}, style: ${t.style}`)
      .join("\n");

    const colorStr = primaryColors.map((c) => typeof c === "string" ? c : `${c.hex} (${c.name})`).join(", ");
    const accentStr = accentColors.map((c) => typeof c === "string" ? c : `${c.hex} (${c.name})`).join(", ");

    // Helper to download an image (tries public URL, then admin client)
    async function downloadImage(url: string, label: string): Promise<{ base64: string; mimeType: string } | null> {
      // Try 1: Direct fetch
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const buf = await resp.arrayBuffer();
          if (buf.byteLength > 100) {
            console.log(`[IMG-GEN] ${label} downloaded: ${buf.byteLength} bytes`);
            return { base64: Buffer.from(buf).toString("base64"), mimeType: resp.headers.get("content-type") || "image/jpeg" };
          }
        } else {
          console.log(`[IMG-GEN] ${label} HTTP ${resp.status}`);
        }
      } catch (err) {
        console.log(`[IMG-GEN] ${label} fetch error:`, (err as Error).message);
      }
      // Try 2: Admin client (for Supabase storage URLs)
      try {
        const urlMatch = url.match(/\/public\/([\w-]+)\/(.+)$/);
        if (urlMatch) {
          const [, bucket, path] = urlMatch;
          console.log(`[IMG-GEN] ${label} trying admin: ${bucket}/${path}`);
          const { data: fileData, error } = await adminClient.storage.from(bucket).download(decodeURIComponent(path));
          if (!error && fileData) {
            const buf = await fileData.arrayBuffer();
            console.log(`[IMG-GEN] ${label} admin download: ${buf.byteLength} bytes`);
            return { base64: Buffer.from(buf).toString("base64"), mimeType: "image/jpeg" };
          }
          console.log(`[IMG-GEN] ${label} admin failed:`, error?.message);
        }
      } catch {}
      console.log(`[IMG-GEN] ${label} FAILED — not available`);
      return null;
    }

    const productImgUrl = concept.product?.image_url ||
      (concept.product?.images || [])[0] ||
      allProducts.find((p: { name: string }) => p.name === concept.product?.name)?.images?.[0];

    console.log(`[IMG-GEN] Concept ${conceptIndex}: ref_ad=${concept.reference_ad_url?.slice(0, 80) || "NONE"}, product=${productImgUrl?.slice(0, 80) || "NONE"}`);

    // === DOWNLOAD IMAGES FIRST ===
    const refImage = concept.reference_ad_url ? await downloadImage(concept.reference_ad_url, "Reference ad") : null;
    const prodImage = productImgUrl ? await downloadImage(productImgUrl, "Product image") : null;

    // === BUILD PARTS: Reference ad FIRST (model follows first image most) ===

    // Part 1: Reference ad image + instruction to copy its style
    if (refImage) {
      parts.push({
        text: `Recreate this ad's EXACT visual style, layout, typography placement, and color scheme — but replace the product with the one shown in the next image. Keep the same composition, text positioning, and overall design approach.`,
      });
      parts.push({ inlineData: { mimeType: refImage.mimeType, data: refImage.base64 } });
    }

    // Part 2: Product image
    if (prodImage) {
      parts.push({
        text: `Use THIS product in the ad. It must be clearly visible and prominent:`,
      });
      parts.push({ inlineData: { mimeType: prodImage.mimeType, data: prodImage.base64 } });
    }

    // Part 3: Concise generation prompt (NOT a wall of text — clear, direct instructions)
    parts.push({
      text: `Create a 1080x1080 Meta ad image.

Product: "${concept.product?.name || "Product"}" — $${concept.product?.price || ""}
Brand: ${storeName}
Colors: ${colorStr || "navy, yellow, red"}
Font: ${typography.primary_font || "Bold sans-serif"}

Text in the ad:
${textOverlays || "No text specified"}

Background: ${concept.ad_layout?.background_style || "dark brand color"}
Style: ${concept.ad_layout?.overall_style || "premium, bold"}

${concept.image_generation_prompt || ""}

${concept.reference_ad_analysis_summary ? `Follow this approach: ${concept.reference_ad_analysis_summary}` : ""}

Rules: Product must be prominent. All text must be readable. Use brand colors. This is a finished ad, not a product photo.`,
    });

    // Generate
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      return errorResponse("GEN_FAILED", `Image generation failed: ${errText.slice(0, 200)}`, 500);
    }

    const data = await resp.json();
    const imgPart = (data.candidates?.[0]?.content?.parts || []).find(
      (p: { inlineData?: { mimeType: string } }) => p.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imgPart?.inlineData) {
      return errorResponse("NO_IMAGE", "No image returned by AI", 500);
    }

    // Upload to storage
    const imgBytes = Buffer.from(imgPart.inlineData.data, "base64");
    const ext = imgPart.inlineData.mimeType === "image/png" ? "png" : "jpg";
    const storagePath = `${brandId}/bulk/concept_${conceptIndex}_${Date.now()}.${ext}`;

    await adminClient.storage.from("generated").upload(storagePath, imgBytes, {
      contentType: imgPart.inlineData.mimeType,
      upsert: true,
    });

    const { data: urlData } = adminClient.storage.from("generated").getPublicUrl(storagePath);

    // Update the concept in ad_concepts array with the image URL
    const { data: currentBrand } = await supabase
      .from("brands")
      .select("ad_concepts")
      .eq("id", brandId)
      .single();

    const concepts = (currentBrand?.ad_concepts || []) as Record<string, unknown>[];
    if (concepts[conceptIndex]) {
      concepts[conceptIndex].image_url = urlData.publicUrl;
      concepts[conceptIndex].image_status = "generated";
      await supabase.from("brands").update({ ad_concepts: concepts }).eq("id", brandId);
    }

    return successResponse({
      image_url: urlData.publicUrl,
      concept_index: conceptIndex,
    });
  } catch (err) {
    return errorResponse("ERROR", (err as Error).message, 500);
  }
}
