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
    provider: ProviderSettings
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
      // Find all markdown image placeholders: ![alt text](image-placeholder)
      const imageRegex = /!\[([^\]]+)\]\(image-placeholder\)/g;
      let match;
      const placeholders: { altText: string; original: string }[] = [];

      while ((match = imageRegex.exec(articleHtml)) !== null) {
        placeholders.push({
          altText: match[1],
          original: match[0]
        });
      }

      if (placeholders.length === 0) {
        setGeneratingImages(false);
        return { success: true, updatedHtml, generatedImages: [] };
      }

      // Generate the first one as featured image (higher quality/dimensions)
      // For now, we'll generate all placeholders sequentially to avoid rate limits
      for (let i = 0; i < placeholders.length; i++) {
        const ph = placeholders[i];
        const isFeatured = i === 0;

        // Simplify prompt for each image using the alt text
        const promptTemplate = inputs.imageSettings.promptInstructions;
        const contentSummary = `Image Subject: ${ph.altText}`;

        const result = await generateImageAction(
          title,
          contentSummary,
          promptTemplate,
          inputs.imageSettings.style,
          inputs.imageSettings.colorMood,
          isFeatured ? inputs.imageSettings.dimensions : "Pinterest Portrait 2:3", // Standardize body images
          provider as any,
          inputs.imageSettings.imgbbApiKey
        );

        if (result.success && result.imageUrl) {
          // Correction 3: Add data-pin-description attribute combining alt text and keyword
          const pinDesc = `${ph.altText} - ${inputs.core.mainKeyword}`;
          const replacementHtml = `\n<figure class="wp-block-image size-large">\n  <img src="${result.imageUrl}" alt="${ph.altText}" data-pin-description="${pinDesc}" />\n</figure>\n`;
          
          updatedHtml = updatedHtml.replace(ph.original, replacementHtml);

          newImages.push({
            sectionHeading: `Image ${i + 1}`,
            altText: ph.altText,
            hostedUrl: result.imageUrl,
            isFeatured,
          });
        } else {
          console.error(`Failed to generate image ${i + 1}:`, result.error);
          // Bug Fix 3: Replace broken image icons with styled placeholder divs
          const fallbackHtml = `\\n<div class="image-placeholder" style="background:#1e293b; border:2px dashed #475569; padding:40px; text-align:center; color:#94a3b8; border-radius:8px; margin:20px 0;">\\n  <span style="font-size:24px;">📷</span><br/>\\n  <span style="font-weight:bold; margin-top:8px; display:block;">Image Generation Failed</span>\\n  <p style="font-size:12px; margin-top:4px;">${ph.altText}</p>\\n</div>\\n`;
          updatedHtml = updatedHtml.replace(ph.original, fallbackHtml);
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
