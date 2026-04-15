"use client";

import { useState, useCallback, useRef } from "react";
import type {
  FormInputs,
  PipelineProgress,
  PipelineStage,
  PipelineResult,
  GeneratedContent,
  SeoOptimizationResult,
  SeoCheckResult,
  PinterestCopyResult,
  SchemaResult,
  QualityScoreResult,
  QualityCategory,
  QualityCheck,
  GeneratedImage,
  ProviderSettings,
} from "../types";
import {
  researchAndPlanAction,
  generateContentAction,
  optimizeSeoAction,
  generatePinterestCopyAction,
  generateImageAction,
} from "@/app/actions/food-seo-writer/generate-v2";
import {
  generateRecipeSchema,
  generateFaqSchema,
  generateArticleSchema,
  extractRecipeFromContent,
  extractFaqFromContent,
} from "../lib/schema-templates";
import { calculateQualityScore } from "../lib/scoring";
import { runAiDetectionScan } from "../lib/ai-detection";
import { DEFAULT_FTC_DISCLOSURE } from "../lib/constants";
import { useImageGeneration } from "./useImageGeneration";

// ─── Initial Pipeline Progress ───

function createInitialProgress(): PipelineProgress {
  return {
    currentStage: "input",
    stages: {
      input: "completed",
      research: "pending",
      content: "pending",
      images: "pending",
      seo: "pending",
      pinterest: "pending",
      scoring: "pending",
    },
    logs: [],
  };
}

// ─── Hook ───

export function useContentGeneration() {
  const [progress, setProgress] = useState<PipelineProgress>(createInitialProgress());
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [fixing, setFixing] = useState(false);
  const abortRef = useRef(false);
  
  const { processImages } = useImageGeneration();

  const addLog = useCallback((msg: string) => {
    setProgress((prev) => ({
      ...prev,
      logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${msg}`],
    }));
  }, []);

  const setStage = useCallback((stage: PipelineStage, status: "active" | "completed" | "error") => {
    setProgress((prev) => ({
      ...prev,
      currentStage: stage,
      stages: { ...prev.stages, [stage]: status },
    }));
  }, []);

  // ─── Full Pipeline ───

  const generate = useCallback(
    async (inputs: FormInputs, provider: ProviderSettings, options?: { isBatchMode?: boolean }): Promise<PipelineResult | null> => {
      setGenerating(true);
      abortRef.current = false;
      setResult(null);
      setProgress(createInitialProgress());

      try {
        // ━━━ STAGE 2: Research & Planning ━━━
        setStage("research", "active");
        addLog("Analyzing keyword and planning content outline...");

        const researchResult = await researchAndPlanAction(inputs, provider);
        if (!researchResult.success || !researchResult.result) {
          throw new Error(researchResult.error || "Research stage failed");
        }

        setStage("research", "completed");
        addLog(`✓ Research complete. Template: ${researchResult.result.selectedTemplate}, Intent: ${researchResult.result.searchIntent}`);
        addLog(`  Title: "${researchResult.result.title}"`);
        addLog(`  Outline: ${researchResult.result.outline.length} sections`);

        if (abortRef.current) return null;

        // ━━━ STAGE 3: Content Generation ━━━
        setStage("content", "active");
        addLog("Generating article content with AI...");

        const contentResult = await generateContentAction(inputs, researchResult.result, provider);
        if (!contentResult.success || !contentResult.content) {
          throw new Error(contentResult.error || "Content generation failed");
        }

        setStage("content", "completed");
        addLog(`✓ Content generated. ${contentResult.wordCount || 0} words.`);

        if (abortRef.current) return null;

        // ━━━ STAGE 3.5: Image Generation ━━━
        let finalContentHtml = contentResult.content;
        let generatedImages: GeneratedImage[] = [];

        if (inputs.imageSettings.enabled) {
          setStage("images", "active");
          addLog("Generating featured and inline images...");

          const imageResult = await processImages(
            finalContentHtml,
            contentResult.title || researchResult.result.title,
            inputs,
            provider,
            addLog
          );

          if (imageResult.success) {
            finalContentHtml = imageResult.updatedHtml;
            generatedImages = imageResult.generatedImages;
            addLog(`✓ Image generation complete. Added ${generatedImages.length} images.`);
          } else {
            addLog(`⚠ Image generation failed or partial: ${imageResult.error}`);
          }
          setStage("images", "completed");
        } else {
          setStage("images", "completed");
          addLog("→ Image generation skipped (disabled)");
        }

        if (abortRef.current) return null;

        // ━━━ STAGE 4: SEO Optimization ━━━
        let finalContent: string;
        let finalTitle: string;
        let finalMeta: string;
        let seoUrlSlug: string;

        if (options?.isBatchMode) {
          // Batch mode: skip redundant AI SEO call — content already has all SEO rules
          // baked into the system prompt. Use local validation only.
          setStage("seo", "active");
          addLog("Running local SEO validation (batch mode)...");

          finalContent = finalContentHtml;
          finalTitle = contentResult.title || researchResult.result.title;
          finalMeta = contentResult.metaDescription || researchResult.result.metaDescription;
          seoUrlSlug = researchResult.result.urlSlug;

          // Local fallback: ensure at least one external link (E-E-A-T signal)
          const extLinkCount = (finalContent.match(/href="https?:\/\//gi) || []).length;
          if (extLinkCount === 0) {
            const nutritionNote = `<h2>Nutrition Note</h2>\n<p>For detailed nutritional information on common recipe ingredients, the <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener noreferrer">USDA FoodData Central database</a> provides comprehensive, science-backed nutrient data that can help you make informed dietary choices.</p>`;
            const faqMatch = finalContent.match(/<h2[^>]*>.*?(?:FAQ|Frequently Asked)/i);
            if (faqMatch && faqMatch.index !== undefined) {
              finalContent = finalContent.slice(0, faqMatch.index) + nutritionNote + "\n" + finalContent.slice(faqMatch.index);
            } else {
              finalContent += "\n" + nutritionNote;
            }
          }

          // Enforce meta description 160 char limit locally
          if (finalMeta.length > 160) {
            const kwLower = inputs.core.mainKeyword.toLowerCase();
            let truncated = finalMeta.substring(0, 155);
            const lastSpace = truncated.lastIndexOf(" ");
            if (lastSpace > 100) truncated = truncated.substring(0, lastSpace);
            truncated = truncated.replace(/[,;:\-]$/, "").trim() + "...";
            if (truncated.toLowerCase().includes(kwLower)) {
              finalMeta = truncated;
            }
          }

          setStage("seo", "completed");
        } else {
          // Single mode: full AI SEO optimization pass
          setStage("seo", "active");
          addLog("Running SEO optimization checks...");

          const seoResult = await optimizeSeoAction(
            finalContentHtml,
            contentResult.title || researchResult.result.title,
            contentResult.metaDescription || researchResult.result.metaDescription,
            inputs.core.mainKeyword,
            provider
          );
          if (!seoResult.success) {
            throw new Error(seoResult.error || "SEO optimization failed");
          }

          finalContent = seoResult.optimizedContent || contentResult.content;
          finalTitle = seoResult.optimizedTitle || contentResult.title || researchResult.result.title;
          finalMeta = seoResult.optimizedMetaDescription || contentResult.metaDescription || researchResult.result.metaDescription;
          seoUrlSlug = seoResult.urlSlug || researchResult.result.urlSlug;

          setStage("seo", "completed");
          addLog(`✓ SEO optimization complete.`);
        }

        // Extract recipe and FAQ from content
        const recipeCard = extractRecipeFromContent(finalContent);
        const faqItems = extractFaqFromContent(finalContent);

        // Build SEO checklist
        const seoChecklist = buildSeoChecklist(finalContent, finalTitle, finalMeta, inputs.core.mainKeyword);
        addLog(`✓ SEO score: Rank Math ${seoChecklist.rankMathScore}/100`);

        if (abortRef.current) return null;

        // ━━━ STAGE 5: Pinterest Optimization ━━━
        let pinterestResult: PinterestCopyResult;
        if (inputs.pinterest.generatePinCopy) {
          setStage("pinterest", "active");
          addLog("Generating Pinterest pin copy variants...");

          const pinResult = await generatePinterestCopyAction(
            inputs.core.mainKeyword,
            finalTitle,
            finalMeta,
            inputs.core.contentType,
            inputs.pinterest.numberOfPinVariants,
            provider
          );

          if (pinResult.success && pinResult.result) {
            // Extract featured image URL from generated article
            const featuredImgMatch = finalContent.match(
              /<figure[^>]*class=["'][^"']*featured-image[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i
            );
            const featuredImageUrl = featuredImgMatch?.[1] ?? '';

            pinterestResult = {
              pinTitles: pinResult.result.pinTitles.map((t, i) => ({ index: i, ...t })),
              pinDescriptions: pinResult.result.pinDescriptions.map((d, i) => ({ index: i, ...d })),
              tobiOverlays: pinResult.result.tobiOverlays.map((t, i) => ({ index: i, ...t })),
              boardSuggestions: pinResult.result.boardSuggestions,
              hiddenPins: pinResult.result.hiddenPins,
              ogMetaTags: `<meta property="og:title" content="${finalTitle}" />\n<meta property="og:description" content="${finalMeta}" />\n<meta property="og:type" content="article" />\n<meta property="og:image" content="${featuredImageUrl}" />`,
              dataPinDescriptions: pinResult.result.pinDescriptions.map((d) => d.text),
              pinImages: [],
            };
            addLog(`✓ Pinterest copy: ${pinResult.result.pinTitles.length} variants generated`);

            // FIX 3: Pinterest Pin Image Generation (parallelized in batches of 3)
            if (inputs.imageSettings.enabled) {
              const numVariants = pinResult.result.pinTitles.length;
              addLog(`Generating ${numVariants} Pinterest pin images (parallel batches of 3)...`);

              const pinImages: GeneratedImage[] = [];
              const PIN_BATCH_SIZE = 3;

              const generatePinWithRetries = async (i: number) => {
                const pinTitle = pinResult.result!.pinTitles[i].text;
                const promptTemplate = inputs.imageSettings.promptInstructions;
                const pinPrompt = `Pinterest pin image for: "${pinTitle}". Food photography style. Vertical portrait format. Include the text "${pinTitle}" as a bold overlay at the bottom of the image with a dark semi-transparent background strip.`;
                const maxRetries = 3;

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                  try {
                    const imgResult = await generateImageAction(
                      pinTitle, pinPrompt, promptTemplate,
                      inputs.imageSettings.style, inputs.imageSettings.colorMood,
                      "Pinterest Portrait 2:3", provider as any,
                      inputs.imageSettings.imgbbApiKey, 'pin'
                    );
                    if (imgResult.success && imgResult.imageUrl) {
                      return { success: true as const, imageUrl: imgResult.imageUrl, index: i, pinTitle };
                    }
                    addLog(`[Image] Pin ${i + 1} attempt ${attempt}/${maxRetries} — no image, retrying...`);
                  } catch (err: any) {
                    addLog(`[Image] Pin ${i + 1} attempt ${attempt}/${maxRetries} failed: ${err.message || "Failed"}`);
                  }
                  if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000));
                }
                return { success: false as const, index: i, pinTitle };
              };

              for (let batchStart = 0; batchStart < numVariants; batchStart += PIN_BATCH_SIZE) {
                const batchIndices = Array.from(
                  { length: Math.min(PIN_BATCH_SIZE, numVariants - batchStart) },
                  (_, k) => batchStart + k
                );
                const results = await Promise.allSettled(batchIndices.map(i => generatePinWithRetries(i)));

                for (const settled of results) {
                  if (settled.status === "fulfilled" && settled.value.success) {
                    pinImages.push({
                      sectionHeading: `Pin Variant ${settled.value.index + 1}`,
                      altText: settled.value.pinTitle,
                      hostedUrl: settled.value.imageUrl!
                    });
                  } else if (settled.status === "fulfilled") {
                    addLog(`[Image Warning] All retries failed for pin ${settled.value.index + 1} — continuing without image`);
                  }
                }
              }

              if (pinImages.length > 0) {
                pinterestResult.pinImages = pinImages;
                addLog(`✓ Pin image generation complete. Added ${pinImages.length} images.`);
              }
            }
          } else {
            pinterestResult = createEmptyPinterest();
            addLog("⚠ Pinterest copy generation failed — using empty defaults");
          }
          setStage("pinterest", "completed");
        } else {
          pinterestResult = createEmptyPinterest();
          setStage("pinterest", "completed");
          addLog("→ Pinterest copy skipped (disabled)");
        }

        if (abortRef.current) return null;

        // ━━━ STAGE 6: Quality Scoring ━━━
        setStage("scoring", "active");
        addLog("Running quality scoring (100-point rubric)...");

        // Determine FTC disclosure
        const hasProducts = inputs.monetization.productLinks.length > 0 || inputs.monetization.productStoreUrl;
        const ftcDisclosure = hasProducts && inputs.monetization.affiliateDisclosure ? DEFAULT_FTC_DISCLOSURE : undefined;

        const generatedContent: GeneratedContent = {
          title: finalTitle,
          articleHtml: finalContent,
          metaDescription: finalMeta,
          urlSlug: seoUrlSlug,
          wordCount: finalContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length,
          recipeCards: recipeCard ? [recipeCard] : [],
          faqItems,
          ftcDisclosure,
        };

        // Generate schemas
        const schemas = buildSchemas(generatedContent, inputs);

        // Calculate quality score
        const qualityScore = calculateQualityScore(
          generatedContent,
          inputs,
          pinterestResult.pinTitles.length > 0 ? pinterestResult : null,
          schemas
        );

        // Run AI detection
        const aiDetection = runAiDetectionScan(finalContent);

        setStage("scoring", "completed");
        addLog(`✓ Quality score: ${qualityScore.totalScore}/100 (${qualityScore.band})`);
        addLog(`  AI detection: ${aiDetection.flaggedPhrases.filter((f) => f.found).length} flagged phrases, TTR: ${aiDetection.ttr}`);

        // ━━━ Assemble Final Result ━━━
        const pipelineResult: PipelineResult = {
          research: researchResult.result,
          content: generatedContent,
          seo: seoChecklist,
          pinterest: pinterestResult,
          schemas,
          quality: qualityScore,
          aiDetection,
          generatedImages,
        };

        setResult(pipelineResult);
        addLog("✅ All stages complete. Content ready for review.");
        return pipelineResult;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error occurred";
        setProgress((prev) => ({
          ...prev,
          error: errMsg,
          stages: {
            ...prev.stages,
            [prev.currentStage]: "error",
          },
        }));
        addLog(`❌ Error: ${errMsg}`);
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [addLog, setStage, processImages]
  );

  // ─── Fix Issues (re-run Stages 3-4 per Correction 6) ───

  const fixIssues = useCallback(
    async (inputs: FormInputs, provider: ProviderSettings, specificResult?: PipelineResult) => {
      const targetResult = specificResult || result;
      if (!targetResult) return null;
      setFixing(true);

      try {
        // Collect issues to fix
        const issues = targetResult.quality.categories
          .flatMap((cat: QualityCategory) => cat.checks)
          .filter((c: QualityCheck) => c.earnedPoints < c.maxPoints && (c.issue || c.fixSuggestion))
          .map((c: QualityCheck) => `- ${c.name}: ${c.issue || c.fixSuggestion}`)
          .join("\n");

        addLog("🔧 Re-running content generation with issue corrections...");
        setStage("content", "active");

        // Collect existing real image URLs from old content (to preserve them)
        const existingImageMap = new Map<string, string>();
        const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi;
        let imgMatch;
        while ((imgMatch = imgTagRegex.exec(targetResult.content.articleHtml)) !== null) {
          const src = imgMatch[1];
          const alt = imgMatch[2];
          if (src.startsWith('http') || src.startsWith('data:')) {
            existingImageMap.set(alt.toLowerCase().trim(), src);
          }
        }
        // Also scan for reverse order (alt before src)
        const imgTagRegex2 = /<img[^>]+alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*>/gi;
        while ((imgMatch = imgTagRegex2.exec(targetResult.content.articleHtml)) !== null) {
          const alt = imgMatch[1];
          const src = imgMatch[2];
          if (src.startsWith('http') || src.startsWith('data:')) {
            existingImageMap.set(alt.toLowerCase().trim(), src);
          }
        }
        addLog(`🔧 Preserving ${existingImageMap.size} existing images...`);

        // Re-run Stage 3 with corrections
        const contentResult = await generateContentAction(
          inputs,
          targetResult.research,
          provider,
          `Fix the following issues from the previous quality review:\n${issues}`
        );

        if (!contentResult.success || !contentResult.content) {
          throw new Error(contentResult.error || "Content fix failed");
        }

        setStage("content", "completed");
        addLog(`✓ Content re-generated with fixes. ${contentResult.wordCount || 0} words.`);

        // Restore existing image URLs into the new content
        let fixedContent = contentResult.content;
        const placeholderImgRegex = /<img([^>]*)src=["']image-placeholder["']([^>]*)>/gi;
        fixedContent = fixedContent.replace(placeholderImgRegex, (fullMatch, before, after) => {
          const altMatch = (before + after).match(/alt=["']([^"']*)["']/i);
          if (altMatch) {
            const altKey = altMatch[1].toLowerCase().trim();
            // Try exact match first, then fuzzy (first 30 chars)
            let existingUrl = existingImageMap.get(altKey);
            if (!existingUrl) {
              const altShort = altKey.substring(0, 30);
              for (const [key, url] of existingImageMap.entries()) {
                if (key.startsWith(altShort) || altShort.startsWith(key.substring(0, 30))) {
                  existingUrl = url;
                  break;
                }
              }
            }
            if (existingUrl) {
              return `<img${before}src="${existingUrl}"${after}>`;
            }
          }
          return fullMatch;
        });

        // Re-run image generation for any remaining placeholders
        let finalImages = targetResult.generatedImages || [];
        if (inputs.imageSettings.enabled) {
          const remainingPlaceholders = (fixedContent.match(/src=["']image-placeholder["']/gi) || []).length;
          if (remainingPlaceholders > 0) {
            addLog(`🔧 Generating ${remainingPlaceholders} new images for new sections...`);
            setStage("images", "active");
            const imageResult = await processImages(
              fixedContent,
              contentResult.title || targetResult.content.title,
              inputs,
              provider,
              addLog
            );
            if (imageResult.success) {
              fixedContent = imageResult.updatedHtml;
              finalImages = [...finalImages, ...imageResult.generatedImages];
            }
            setStage("images", "completed");
          }
        }

        // Re-run Stage 4
        setStage("seo", "active");
        addLog("🔧 Re-running SEO optimization...");

        const seoResult = await optimizeSeoAction(
          fixedContent,
          contentResult.title || targetResult.content.title,
          contentResult.metaDescription || targetResult.content.metaDescription,
          inputs.core.mainKeyword,
          provider,
          `Ensure these SEO issues are fixed:\n${issues}`
        );

        const finalContent = seoResult.optimizedContent || fixedContent;
        const finalTitle = seoResult.optimizedTitle || contentResult.title || targetResult.content.title;
        const finalMeta = seoResult.optimizedMetaDescription || contentResult.metaDescription || targetResult.content.metaDescription;

        const recipeCard = extractRecipeFromContent(finalContent);
        const faqItems = extractFaqFromContent(finalContent);
        const seoChecklist = buildSeoChecklist(finalContent, finalTitle, finalMeta, inputs.core.mainKeyword);

        setStage("seo", "completed");

        // Re-score
        setStage("scoring", "active");

        const hasProducts = inputs.monetization.productLinks.length > 0 || inputs.monetization.productStoreUrl;
        const ftcDisclosure = hasProducts && inputs.monetization.affiliateDisclosure ? DEFAULT_FTC_DISCLOSURE : undefined;

        const generatedContent: GeneratedContent = {
          title: finalTitle,
          articleHtml: finalContent,
          metaDescription: finalMeta,
          urlSlug: seoResult.urlSlug || targetResult.research.urlSlug,
          wordCount: finalContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length,
          recipeCards: recipeCard ? [recipeCard] : [],
          faqItems,
          ftcDisclosure,
        };

        const schemas = buildSchemas(generatedContent, inputs);
        const qualityScore = calculateQualityScore(
          generatedContent,
          inputs,
          targetResult.pinterest && targetResult.pinterest.pinTitles && targetResult.pinterest.pinTitles.length > 0 ? targetResult.pinterest : null,
          schemas
        );
        const aiDetection = runAiDetectionScan(finalContent);

        setStage("scoring", "completed");
        addLog(`✓ Fixed quality score: ${qualityScore.totalScore}/100 (${qualityScore.band})`);

        const fixedResult: PipelineResult = {
          ...targetResult,
          content: generatedContent,
          seo: seoChecklist,
          schemas,
          quality: qualityScore,
          aiDetection,
          generatedImages: finalImages,
        };

        if (!specificResult) {
          setResult(fixedResult);
        }
        return fixedResult;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Fix failed";
        addLog(`❌ Fix error: ${errMsg}`);
        return null;
      } finally {
        setFixing(false);
      }
    },
    [result, addLog, setStage, processImages]
  );

  const reset = useCallback(() => {
    setProgress(createInitialProgress());
    setResult(null);
    setGenerating(false);
    setFixing(false);
    abortRef.current = false;
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
    setGenerating(false);
    addLog("⛔ Generation cancelled by user.");
  }, [addLog]);

  return {
    progress,
    result,
    setResult,
    generating,
    fixing,
    generate,
    fixIssues,
    reset,
    abort,
  };
}

// ─── Helper: Build SEO Checklist ───

function buildSeoChecklist(
  content: string,
  title: string,
  metaDescription: string,
  keyword: string
): SeoOptimizationResult {
  const text = content.replace(/<[^>]*>/g, " ");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const kwLower = keyword.toLowerCase();
  const textLower = text.toLowerCase();

  const checks: SeoCheckResult[] = [];

  // Title checks
  const titleLen = title.length;
  checks.push({
    name: "Title: 50-60 characters",
    passed: titleLen >= 50 && titleLen <= 60,
    details: `Title is ${titleLen} chars`,
  });
  checks.push({
    name: "Title: Contains focus keyword",
    passed: title.toLowerCase().includes(kwLower),
    details: title.toLowerCase().includes(kwLower) ? "Keyword found in title" : "Keyword NOT in title",
  });

  // Meta
  const metaLen = metaDescription.length;
  checks.push({
    name: "Meta: 120-160 characters",
    passed: metaLen >= 120 && metaLen <= 160,
    details: `Meta is ${metaLen} chars`,
  });
  checks.push({
    name: "Meta: Contains focus keyword",
    passed: metaDescription.toLowerCase().includes(kwLower),
    details: metaDescription.toLowerCase().includes(kwLower) ? "Keyword in meta" : "Keyword NOT in meta",
  });

  // First paragraph
  const firstPara = textLower.slice(0, 500);
  checks.push({
    name: "Keyword in first paragraph",
    passed: firstPara.includes(kwLower),
    details: firstPara.includes(kwLower) ? "Found within first 500 chars" : "Not found in opening",
  });

  // H1 check
  const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
  checks.push({
    name: "Exactly one H1 tag",
    passed: h1Count === 1,
    details: `Found ${h1Count} H1 tag(s)`,
  });

  // H2 keyword stuffing
  const h2s = [...content.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map((m) => m[1].replace(/<[^>]*>/g, "").toLowerCase());
  const h2sWithKw = h2s.filter((h) => h.includes(kwLower));
  checks.push({
    name: "Keyword in max 2 H2s",
    passed: h2sWithKw.length <= 2,
    details: `Keyword in ${h2sWithKw.length} of ${h2s.length} H2 headings`,
  });

  // Keyword density
  const kwWords = keyword.split(/\s+/).length;
  let kwOccurrences = 0;
  let idx = 0;
  while ((idx = textLower.indexOf(kwLower, idx)) !== -1) { kwOccurrences++; idx += kwLower.length; }
  const density = wordCount > 0 ? (kwOccurrences * kwWords / wordCount) * 100 : 0;
  checks.push({
    name: "Keyword density 1-2%",
    passed: density >= 1 && density <= 2,
    details: `${density.toFixed(1)}% density (${kwOccurrences} occurrences in ${wordCount} words)`,
  });

  // Image alt text
  const imgAlts = [...content.matchAll(/alt="([^"]*)"/gi)].map((m) => m[1]);
  const imgAltWithKw = imgAlts.filter((a) => a.toLowerCase().includes(kwLower));
  checks.push({
    name: "Images have alt text with keyword",
    passed: imgAlts.length === 0 || imgAltWithKw.length > 0,
    details: `${imgAltWithKw.length} of ${imgAlts.length} images have keyword in alt text`,
  });

  // Internal/external links — only count absolute URLs, NOT relative /slug links (those are fabricated and stripped)
  const allLinks = content.match(/<a\s[^>]*href="https?:\/\/[^"]+"/gi) || [];
  // Internal = links to WP site domain (e.g. sourcerecipes.info)
  const internalLinks = allLinks.filter(l => /sourcerecipes\.info|localhost/i.test(l)).length;
  const externalLinks = allLinks.length - internalLinks;
  checks.push({
    name: "At least 2 internal + 1 external link",
    passed: internalLinks >= 2 && externalLinks >= 1,
    details: `${internalLinks} internal, ${externalLinks} external`,
  });

  const passedCount = checks.filter((c) => c.passed).length;
  const rankMathScore = Math.round((passedCount / checks.length) * 100);

  return {
    checklist: checks,
    rankMathScore,
    optimizedContent: content,
    optimizedTitle: title,
    optimizedMetaDescription: metaDescription,
  };
}

// ─── Helper: Build Schemas ───

function buildSchemas(content: GeneratedContent, inputs: FormInputs): SchemaResult {
  // Recipe schema
  let recipeSchema, recipeValidation;
  if (content.recipeCards.length > 0) {
    const recipe = content.recipeCards[0];
    const r = generateRecipeSchema(
      recipe,
      content.title,
      content.metaDescription,
      inputs.core.mainKeyword,
      inputs.keywords.secondaryKeywords
    );
    recipeSchema = r.schema;
    recipeValidation = r.validations;
  } else {
    recipeValidation = [{ status: "warning" as const, message: "No recipe card found in content" }];
  }

  // FAQ schema
  let faqSchema, faqValidation;
  if (content.faqItems.length > 0) {
    const f = generateFaqSchema(content.faqItems);
    faqSchema = f.schema;
    faqValidation = f.validations;
  } else {
    faqValidation = [{ status: "warning" as const, message: "No FAQ section found in content" }];
  }

  // Extract featured image from generated article
  const featuredImgMatch = content.articleHtml.match(
    /<figure[^>]*class=["'][^"']*featured-image[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i
  );
  const featuredImageUrl = featuredImgMatch?.[1] || undefined;

  // Article schema (always generated)
  const a = generateArticleSchema(
    content.title,
    content.metaDescription,
    undefined,
    undefined,
    undefined,
    undefined,
    featuredImageUrl,
    inputs.core.targetSite ? `${inputs.core.targetSite}/${content.urlSlug}` : undefined
  );

  return {
    recipeSchema,
    recipeValidation,
    faqSchema,
    faqValidation,
    articleSchema: a.schema,
    articleValidation: a.validations,
  };
}

// ─── Helper: Empty Pinterest Result ───

function createEmptyPinterest(): PinterestCopyResult {
  return {
    pinTitles: [],
    pinDescriptions: [],
    tobiOverlays: [],
    boardSuggestions: [],
    hiddenPins: [],
    ogMetaTags: "",
    dataPinDescriptions: [],
    pinImages: [],
  };
}
