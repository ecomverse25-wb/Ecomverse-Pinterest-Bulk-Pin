import { useState, useRef, useCallback } from "react";
import type { FoodArticle, FoodSeoSettings, WritingProvider, ImageProvider, SectionImage } from "../types";
import {
    generateFoodArticleAction,
    publishFoodArticleToWPAction
} from "@/app/actions/food-seo-writer/generate";
import {
    matchAffiliateLinksAction
} from "@/app/actions/blog-monetizer/generate";
import {
    generateFeaturedImageAction,
    generateH2ImageAction,
} from "@/app/actions/blog-monetizer/generate-image";

interface UseArticleGenerationProps {
    settings: FoodSeoSettings;
    geminiKey: string;
    replicateKey: string;
    imgbbKey: string;
    anthropicKey: string;
    openaiKey: string;
    writingProvider: WritingProvider;
    writingModel: string;
    imageProvider: ImageProvider;
    imageModel: string;
    wpUrl: string;
    wpUser: string;
    wpPassword: string;
    setStatusMessage: (msg: string) => void;
    setActiveTab: (tab: "setup" | "studio" | "pins") => void;
}

export function useArticleGeneration({
    settings, geminiKey, replicateKey, imgbbKey, anthropicKey, openaiKey,
    writingProvider, writingModel, imageProvider, imageModel,
    wpUrl, wpUser, wpPassword, setStatusMessage, setActiveTab,
}: UseArticleGenerationProps) {
    const [articles, setArticles] = useState<FoodArticle[]>([]);
    const [generating, setGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
    const [paused, setPaused] = useState(false);
    const pausedRef = useRef(false);
    const stoppedRef = useRef(false);

    const updateArticle = useCallback((index: number, updated: FoodArticle) => {
        setArticles(prev => {
            const copy = [...prev];
            copy[index] = updated;
            return copy;
        });
    }, []);

    const generateAllArticles = useCallback(async (items: { keyword: string; title: string }[]) => {
        if (items.length === 0) { alert("No keywords to generate."); return; }

        setGenerating(true);
        pausedRef.current = false;
        stoppedRef.current = false;
        setPaused(false);
        setGenerationProgress({ current: 0, total: items.length });
        setActiveTab("studio");

        const newArticles: FoodArticle[] = items.map(item => ({
            keyword: item.keyword,
            title: item.title,
            content: "",
            metaDescription: "",
            wordCount: 0,
            sectionImages: [],
            status: "pending" as const,
        }));
        setArticles(newArticles);

        const affiliateLinksText = settings.affiliateLinks
            .map(a => `${a.productName} | ${a.url}`)
            .join("\n");

        for (let i = 0; i < newArticles.length; i++) {
            if (stoppedRef.current) break;

            while (pausedRef.current) {
                await new Promise(r => setTimeout(r, 500));
                if (stoppedRef.current) break;
            }
            if (stoppedRef.current) break;

            setGenerationProgress({ current: i + 1, total: newArticles.length });
            const item = items[i];

            setArticles(prev => {
                const copy = [...prev];
                copy[i] = { ...copy[i], status: "generating" };
                return copy;
            });
            setStatusMessage(`⚡ Generating food SEO article: "${item.keyword}" (${i + 1}/${newArticles.length})`);

            try {
                const artResult = await generateFoodArticleAction(
                    item.title, item.keyword, settings.niche,
                    settings.tone, settings.contentStrategy, settings.h2Count,
                    settings.titleFormula, settings.schemaType,
                    settings.authoritySource, settings.faqCount,
                    settings.internalLinkTopics, affiliateLinksText,
                    settings.amazonAffiliateTag,
                    settings.storeProducts,
                    writingModel, writingProvider,
                    geminiKey, anthropicKey, openaiKey, replicateKey
                );

                if (!artResult.success || !artResult.content) {
                    setArticles(prev => {
                        const copy = [...prev];
                        copy[i] = { ...copy[i], status: "error", errorMessage: artResult.error };
                        return copy;
                    });
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }

                let finalContent = artResult.content;
                let generatedTitle = artResult.title || item.title;
                if (!artResult.title) {
                    const h1Match = finalContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
                    if (h1Match) generatedTitle = h1Match[1].replace(/<[^>]*>/g, "").trim();
                }

                // Inject affiliate links
                if (settings.affiliateLinks.length > 0) {
                    setStatusMessage(`🔗 Injecting affiliate links: "${item.keyword}"`);
                    const affResult = await matchAffiliateLinksAction(
                        finalContent, settings.affiliateLinks, geminiKey, writingModel,
                        writingProvider, anthropicKey, openaiKey, replicateKey
                    );
                    if (affResult.success && affResult.injectedHtml) {
                        finalContent = affResult.injectedHtml;
                    }
                }

                // Generate images
                const sectionImages: SectionImage[] = [];
                const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
                const h2Headings: string[] = [];
                let h2Match;
                while ((h2Match = h2Regex.exec(finalContent)) !== null) {
                    h2Headings.push(h2Match[1].replace(/<[^>]*>/g, ""));
                }

                let imageError: string | undefined;
                let featuredImageUrl: string | undefined;
                let featuredImagePrompt: string | undefined;

                const hasImageKey = imageProvider === "google-imagen" ? !!geminiKey : !!replicateKey;

                if (hasImageKey) {
                    setStatusMessage(`🖼️ Generating featured image: "${item.keyword}"`);
                    try {
                        const summary = finalContent.replace(/<[^>]*>/g, " ").slice(0, 800);
                        const featResult = await generateFeaturedImageAction(
                            generatedTitle, summary,
                            settings.featuredImage.promptTemplate,
                            settings.featuredImage.style,
                            settings.featuredImage.colorMood,
                            "1200x628",
                            geminiKey, replicateKey, imgbbKey, writingModel,
                            imageProvider, imageModel
                        );
                        if (featResult.success && featResult.imageUrl) {
                            featuredImageUrl = featResult.imageUrl;
                            featuredImagePrompt = featResult.prompt;
                        } else {
                            imageError = featResult.error || "Featured image generation failed";
                        }
                    } catch (err) {
                        imageError = err instanceof Error ? err.message : "Featured image error";
                    }

                    const FAQ_HEADINGS = [
                        "frequently asked questions", "faq", "f.a.q",
                        "common questions", "questions and answers",
                        "q&a", "q & a", "people also ask", "questions about",
                    ];

                    for (let j = 0; j < h2Headings.length; j++) {
                        const headingLower = h2Headings[j].toLowerCase().trim();
                        const isFAQ = FAQ_HEADINGS.some(f => headingLower.includes(f));

                        if (isFAQ) {
                            sectionImages.push({ h2Index: j, h2Title: h2Headings[j], imageUrl: "", isFAQ: true });
                            continue;
                        }

                        setStatusMessage(`🎨 Generating section images: ${j + 1}/${h2Headings.length} — "${item.keyword}"`);
                        let sectionImageUrl: string | undefined;
                        try {
                            const secResult = await generateH2ImageAction(
                                h2Headings[j], settings.niche, replicateKey, imgbbKey,
                                imageProvider, imageModel, geminiKey,
                                settings.featuredImage.dimensions
                            );
                            if (secResult.success && secResult.imageUrl) sectionImageUrl = secResult.imageUrl;
                        } catch (err) {
                            console.error(`[FoodSEO] Section image ${j} failed:`, err);
                        }

                        if (!sectionImageUrl) {
                            setStatusMessage(`🔄 Retrying section image ${j + 1}/${h2Headings.length}`);
                            try {
                                const retryResult = await generateH2ImageAction(
                                    h2Headings[j], settings.niche, replicateKey, imgbbKey,
                                    imageProvider, imageModel, geminiKey,
                                    settings.featuredImage.dimensions
                                );
                                if (retryResult.success && retryResult.imageUrl) sectionImageUrl = retryResult.imageUrl;
                            } catch (retryErr) {
                                console.error(`[FoodSEO] Retry failed for: "${h2Headings[j]}"`, retryErr);
                            }
                        }

                        sectionImages.push({ h2Index: j, h2Title: h2Headings[j], imageUrl: sectionImageUrl || "" });
                    }
                } else {
                    imageError = `${imageProvider === "google-imagen" ? "Gemini" : "Replicate"} API key not set — images skipped`;
                }

                // Inject section images into HTML
                if (sectionImages.length > 0) {
                    const sorted = [...sectionImages].sort((a, b) => b.h2Index - a.h2Index);
                    for (const img of sorted) {
                        const h2CloseRegex = /<\/h2>/gi;
                        let count = 0;
                        finalContent = finalContent.replace(h2CloseRegex, (match) => {
                            if (count === img.h2Index) {
                                count++;
                                if (!img.imageUrl || img.isFAQ) return match;
                                return `${match}
<figure style="max-width:500px;margin:12px auto;position:relative;">
  <img src="${img.imageUrl}" alt="${img.h2Title}" style="width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:12px;display:block;" />
</figure>`;
                            }
                            count++;
                            return match;
                        });
                    }
                }

                setStatusMessage(`✅ Complete: "${generatedTitle}"`);
                setArticles(prev => {
                    const copy = [...prev];
                    copy[i] = {
                        ...copy[i],
                        title: generatedTitle,
                        content: finalContent,
                        metaDescription: artResult.metaDescription || "",
                        wordCount: artResult.wordCount || 0,
                        featuredImageUrl,
                        featuredImagePrompt,
                        sectionImages,
                        imageError,
                        pinTitle: artResult.pinTitle,
                        pinDescription: artResult.pinDescription,
                        schemaMarkup: artResult.schemaMarkup,
                        tags: artResult.tags,
                        status: "ready",
                    };
                    return copy;
                });

            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Unknown error";

                if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
                    setStatusMessage("⏳ Rate limit hit, waiting 30s...");
                    await new Promise(r => setTimeout(r, 30000));
                    i--;
                    continue;
                }

                setArticles(prev => {
                    const copy = [...prev];
                    copy[i] = { ...copy[i], status: "error", errorMessage: msg };
                    return copy;
                });
            }

            if (i < newArticles.length - 1) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        setGenerating(false);
        setStatusMessage(`✅ Generation complete!`);
    }, [settings, geminiKey, replicateKey, imgbbKey, anthropicKey, openaiKey,
        writingProvider, writingModel, imageProvider, imageModel, setStatusMessage, setActiveTab]);

    const publishAllToWP = useCallback(async () => {
        if (!wpUrl || !wpUser || !wpPassword) { alert("WordPress credentials required."); return; }
        const readyArticles = articles.filter(a => a.status === "ready");
        console.log(`[FOOD-SEO] publishAllToWP called — publishMode: "${settings.publishMode}", niche: "${settings.niche}", articles: ${readyArticles.length}`);
        for (let i = 0; i < readyArticles.length; i++) {
            setStatusMessage(`📤 Publishing... ${i + 1}/${readyArticles.length}`);
            const art = readyArticles[i];
            try {
                const pubMode = settings.publishMode || 'publish';
                console.log(`[FOOD-SEO] Calling publishFoodArticleToWPAction with publishMode="${pubMode}", niche="${settings.niche}"`);
                const result = await publishFoodArticleToWPAction(art, wpUrl, wpUser, wpPassword, settings.niche, pubMode);
                if (result.success) {
                    const idx = articles.indexOf(art);
                    if (idx !== -1) updateArticle(idx, { ...art, status: "published", wpLink: result.link, wpPostId: result.id });
                } else {
                    setStatusMessage(`❌ Publish Failed: ${result.error || "WordPress connection issue"}`);
                    await new Promise(r => setTimeout(r, 3000));
                }
            } catch (err: unknown) {
                setStatusMessage(`❌ Publish Failed: Network error or bad WP credentials`);
                await new Promise(r => setTimeout(r, 3000));
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        if (readyArticles.length > 0) setStatusMessage("✅ Publishing process finished!");
    }, [articles, wpUrl, wpUser, wpPassword, settings.publishMode, settings.niche, setStatusMessage, updateArticle]);

    const exportTitlesCSV = useCallback((items: { keyword: string; title: string }[]) => {
        const csv = "keyword,title\n" + items.map(r => `"${r.keyword}","${r.title}"`).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "food-seo-writer-titles.csv"; a.click();
        URL.revokeObjectURL(url);
    }, []);

    const exportArticlesZip = useCallback(async () => {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const art of articles.filter(a => a.status === "ready" || a.status === "published")) {
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${art.title}</title></head><body>${art.content}</body></html>`;
            zip.file(`${art.keyword.replace(/\s+/g, "-")}.html`, html);
        }
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url; a.download = "food-seo-articles.zip"; a.click();
        URL.revokeObjectURL(url);
    }, [articles]);

    const handlePause = useCallback(() => {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
    }, []);

    const handleStop = useCallback(() => {
        stoppedRef.current = true;
        pausedRef.current = false;
        setPaused(false);
    }, []);

    return {
        articles, setArticles,
        generating, generationProgress, paused,
        updateArticle,
        generateAllArticles,
        publishAllToWP,
        exportTitlesCSV,
        exportArticlesZip,
        handlePause, handleStop,
    };
}
