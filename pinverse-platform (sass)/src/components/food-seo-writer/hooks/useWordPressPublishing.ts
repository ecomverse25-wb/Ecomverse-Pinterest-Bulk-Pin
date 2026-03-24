"use client";

import { useState, useCallback } from "react";
import type { FormInputs, GeneratedImage } from "../types";
import { publishToWordPressAction } from "@/app/actions/food-seo-writer/generate-v2";

export function useWordPressPublishing() {
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; link?: string; id?: number; error?: string } | null>(null);

  const publishToWP = useCallback(async (
    title: string,
    articleHtml: string,
    inputs: FormInputs,
    images: GeneratedImage[]
  ) => {
    setPublishing(true);
    setPublishResult(null);

    try {
      // Find the featured image (the first one marked isFeatured, or just the first one)
      const featuredImg = images.find(img => img.isFeatured) || images[0];
      const featuredImageUrl = featuredImg?.hostedUrl;

      const result = await publishToWordPressAction({
        title,
        content: articleHtml,
        featuredImageUrl,
        settings: inputs.wordpress,
        rankMathFocusKeyword: inputs.core.mainKeyword,
      });

      setPublishResult(result);
      return result;

    } catch (err: any) {
      console.error("WordPress publishing hook error:", err);
      const errorResult = { success: false, error: err.message || "An unexpected error occurred during publishing." };
      setPublishResult(errorResult);
      return errorResult;
    } finally {
      setPublishing(false);
    }
  }, []);

  const resetPublishState = useCallback(() => {
    setPublishResult(null);
  }, []);

  return {
    publishing,
    publishResult,
    publishToWP,
    resetPublishState,
  };
}
