"use client";

import { useState, useCallback } from "react";
import type { FormInputs, GeneratedImage, ProviderSettings } from "../types";
import { generateImageAction } from "@/app/actions/food-seo-writer/generate-v2";

export function useImageGeneration() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const processImages = useCallback(async (
    articleHtml: string,
    title: string,
    inputs: FormInputs,
    provider: ProviderSettings,
    onLog?: (msg: string) => void
  ): Promise<{ success: boolean; updatedHtml: string; generatedImages: GeneratedImage[]; error?: string }> => {
    if (!inputs.imageSettings.enabled) {
      return { success: true, updatedHtml: articleHtml, generatedImages: [] };
    }

    // Bug Fix 3: Warn if API key missing
    const imgKey = provider.imageProvider === provider.contentProvider && provider.useSharedKey 
      ? provider.contentApiKey 
      : provider.imageApiKey;
      
    if (!imgKey) {
      setImageError(`Missing API Key for ${provider.imageProvider}. Image generation skipped.`);
      return { success: false, updatedHtml: articleHtml, generatedImages: [], error: "Missing Image API Key" };
    }

    setGeneratingImages(true);
    setImageError(null);

    let updatedHtml = articleHtml;
    const newImages: GeneratedImage[] = [];

    try {
      // 1. Find all markdown image placeholders: ![alt text](placeholder-url)
      const mdRegex = /!\[([^\]]+)\]\(([^)]*)\)/g;
      let match;
      const placeholders: { altText: string; original: string; isHtml: boolean }[] = [];

      while ((match = mdRegex.exec(articleHtml)) !== null) {
        if (!match[2].startsWith("http")) {
          placeholders.push({ altText: match[1], original: match[0], isHtml: false });
        }
      }

      // 2. Find all HTML image placeholders: <img src="placeholder-url" alt="alt text">
      const htmlRegex = /<img[^>]+>/gi;
      while ((match = htmlRegex.exec(articleHtml)) !== null) {
        const imgTag = match[0];
        const srcMatch = imgTag.match(/src=["']([^"']*)["']/i);
        const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
        const src = srcMatch ? srcMatch[1] : "";
        const alt = altMatch ? altMatch[1] : `Featured image for ${title}`;
        
        if (!src.startsWith("http")) {
          placeholders.push({ altText: alt, original: imgTag, isHtml: true });
        }
      }

      if (placeholders.length === 0) {
        setGeneratingImages(false);
        return { success: true, updatedHtml, generatedImages: [] };
      }

      // Generate images in parallel batches of 3 (quality preserved — same retries per image)
      const IMG_BATCH_SIZE = 3;

      const generateSingleImage = async (ph: typeof placeholders[0], idx: number) => {
        const isFeatured = idx === 0;
        const promptTemplate = inputs.imageSettings.promptInstructions;
        const contentSummary = `Image Subject: ${ph.altText}`;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await generateImageAction(
              title,
              contentSummary,
              promptTemplate,
              inputs.imageSettings.style,
              inputs.imageSettings.colorMood,
              isFeatured ? inputs.imageSettings.dimensions : "Pinterest Portrait 2:3",
              provider as any,
              inputs.imageSettings.imgbbApiKey,
              isFeatured ? 'featured' : 'inline'
            );

            if (result.success && result.imageUrl) {
              return { success: true as const, imageUrl: result.imageUrl, idx, ph, isFeatured };
            }
            if (onLog) onLog(`[Image] Image ${idx + 1} attempt ${attempt}/${maxRetries} — no image, retrying...`);
          } catch (err: any) {
            if (onLog) onLog(`[Image] Image ${idx + 1} attempt ${attempt}/${maxRetries} failed: ${err.message || "Failed"}`);
          }
          if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000));
        }
        return { success: false as const, idx, ph, isFeatured };
      };

      if (onLog) onLog(`[Image] Processing ${placeholders.length} images in parallel batches of ${IMG_BATCH_SIZE}...`);

      for (let batchStart = 0; batchStart < placeholders.length; batchStart += IMG_BATCH_SIZE) {
        const batch = placeholders.slice(batchStart, batchStart + IMG_BATCH_SIZE);
        if (onLog) onLog(`[Image] Batch ${Math.floor(batchStart / IMG_BATCH_SIZE) + 1}/${Math.ceil(placeholders.length / IMG_BATCH_SIZE)} (${batch.length} images)...`);

        const results = await Promise.allSettled(
          batch.map((ph, batchIdx) => generateSingleImage(ph, batchStart + batchIdx))
        );

        for (const settled of results) {
          if (settled.status === "fulfilled") {
            const res = settled.value;
            if (res.success) {
              // Correction 3: Add data-pin-description attribute combining alt text and keyword
              const pinDesc = `${res.ph.altText} - ${inputs.core.mainKeyword}`.replace(/"/g, "&quot;");
              const replacementHtml = res.ph.isHtml
                ? `<img src="${res.imageUrl}" alt="${res.ph.altText.replace(/"/g, "&quot;")}" data-pin-description="${pinDesc}" />`
                : `\n<figure class="wp-block-image size-large">\n  <img src="${res.imageUrl}" alt="${res.ph.altText.replace(/"/g, "&quot;")}" data-pin-description="${pinDesc}" />\n</figure>\n`;

              updatedHtml = updatedHtml.replace(res.ph.original, replacementHtml);

              newImages.push({
                sectionHeading: `Image ${res.idx + 1}`,
                altText: res.ph.altText,
                hostedUrl: res.imageUrl,
                isFeatured: res.isFeatured,
              });
            } else {
              // Bug Fix 3: Replace broken image icons with styled placeholder divs
              const fallbackHtml = `\n<div class="image-placeholder" style="background:#1e293b; border:2px dashed #475569; padding:40px; text-align:center; color:#94a3b8; border-radius:8px; margin:20px 0;">\n  <span style="font-size:24px;">🖼️</span><br/>\n  <span style="font-weight:bold; margin-top:8px; display:block;">AI image will be generated here</span>\n  <p style="font-size:12px; margin-top:4px;">${res.ph.altText}</p>\n</div>\n`;
              updatedHtml = updatedHtml.replace(res.ph.original, fallbackHtml);
            }
          }
        }
      }

      setImages(newImages);
      setGeneratingImages(false);
      return { success: true, updatedHtml, generatedImages: newImages };

    } catch (err: any) {
      console.error("Image generation hook error:", err);
      const msg = err.message || "Failed to process images.";
      setImageError(msg);
      setGeneratingImages(false);
      return { success: false, updatedHtml: articleHtml, generatedImages: [], error: msg };
    }
  }, []);

  return {
    images,
    generatingImages,
    imageError,
    processImages,
  };
}
