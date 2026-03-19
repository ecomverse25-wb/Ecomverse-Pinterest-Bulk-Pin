import { useState, useCallback, useEffect, useRef } from "react";
import type { WritingProvider } from "@/components/blog-monetizer/BlogMonetizer.types";
import type { FoodArticle } from "../types";
import { generateFoodPinVariationsAction, type FoodPinVariation } from "@/app/actions/food-seo-writer/generate-pin-text";

// ─── Extended Pin Variation with card metadata ───

export interface FoodPinCard extends FoodPinVariation {
    type: 'featured' | 'howto' | 'curiosity' | 'from-article' | 'from-studio';
    targetKeyword: string;
    destinationUrl: string;
    imageUrl: string;
}

export interface ArticlePinSet {
    articleKeyword: string;
    articleTitle: string;
    variations: FoodPinCard[];
    generating: boolean;
}

interface UsePinGenerationProps {
    writingModel: string;
    writingProvider: WritingProvider;
    niche: string;
    wpUrl: string;
}

export function usePinGeneration({
    writingModel, writingProvider,
    niche, wpUrl,
}: UsePinGenerationProps) {
    const [pinSets, setPinSets] = useState<ArticlePinSet[]>([]);
    const [generatingPins, setGeneratingPins] = useState(false);
    const autoPopulatedRef = useRef(false);

    // ─── Auto-populate pin cards when articles become ready ───
    const autoPopulatePins = useCallback((articles: FoodArticle[]) => {
        const readyArticles = articles.filter(a => a.status === "ready" || a.status === "published");
        if (readyArticles.length === 0) return;

        const autoPins: ArticlePinSet[] = readyArticles.map(article => ({
            articleKeyword: article.keyword,
            articleTitle: article.title,
            generating: false,
            variations: [
                // Pin #1 — Featured ⭐ (from article's [PIN_TITLE] / [PIN_DESCRIPTION])
                {
                    variationNumber: 1,
                    label: "Featured ⭐",
                    type: 'featured' as const,
                    targetKeyword: article.keyword,
                    pinTitle: article.pinTitle || '',
                    pinDescription: article.pinDescription || '',
                    destinationUrl: wpUrl || '',
                    imageUrl: article.featuredImageUrl || '',
                },
                // Pin #2 — How-To (empty, filled by generate-pin-text.ts)
                {
                    variationNumber: 2,
                    label: "How-To",
                    type: 'howto' as const,
                    targetKeyword: article.keyword,
                    pinTitle: '',
                    pinDescription: '',
                    destinationUrl: wpUrl || '',
                    imageUrl: article.sectionImages?.[0]?.imageUrl || '',
                },
                // Pin #3 — Curiosity (empty, filled by generate-pin-text.ts)
                {
                    variationNumber: 3,
                    label: "Curiosity",
                    type: 'curiosity' as const,
                    targetKeyword: article.keyword,
                    pinTitle: '',
                    pinDescription: '',
                    destinationUrl: wpUrl || '',
                    imageUrl: article.sectionImages?.[1]?.imageUrl || '',
                },
            ],
        }));

        setPinSets(autoPins);
        autoPopulatedRef.current = true;
    }, [wpUrl]);

    // ─── Generate AI pin text for How-To + Curiosity slots ───
    const generatePinsForArticles = useCallback(async (articles: FoodArticle[]) => {
        const readyArticles = articles.filter(a => a.status === "ready" || a.status === "published");
        if (readyArticles.length === 0) return;

        setGeneratingPins(true);

        // If pinSets haven't been auto-populated yet, do it now
        if (pinSets.length === 0) {
            autoPopulatePins(articles);
        }

        // Mark all as generating
        setPinSets(prev => prev.map(p => ({ ...p, generating: true })));

        for (let i = 0; i < readyArticles.length; i++) {
            const article = readyArticles[i];

            try {
                const result = await generateFoodPinVariationsAction(
                    article.keyword, article.title, niche,
                    writingModel, writingProvider
                );

                if (result.success && result.variations) {
                    setPinSets(prev => {
                        const copy = [...prev];
                        const setIdx = copy.findIndex(p => p.articleKeyword === article.keyword);
                        if (setIdx === -1) return copy;

                        const existing = copy[setIdx];
                        const updatedVariations = existing.variations.map(v => {
                            // Match AI-generated variations to existing card slots
                            if (v.type === 'featured') {
                                // Keep featured as-is (from article), but fill if empty
                                const aiV1 = result.variations!.find(rv => rv.variationNumber === 1);
                                if (!v.pinTitle && aiV1) {
                                    return { ...v, pinTitle: aiV1.pinTitle, pinDescription: aiV1.pinDescription };
                                }
                                return v;
                            }
                            if (v.type === 'howto') {
                                const aiV2 = result.variations!.find(rv => rv.variationNumber === 2);
                                if (aiV2) {
                                    return { ...v, pinTitle: aiV2.pinTitle, pinDescription: aiV2.pinDescription };
                                }
                                return v;
                            }
                            if (v.type === 'curiosity') {
                                const aiV3 = result.variations!.find(rv => rv.variationNumber === 3);
                                if (aiV3) {
                                    return { ...v, pinTitle: aiV3.pinTitle, pinDescription: aiV3.pinDescription };
                                }
                                return v;
                            }
                            return v;
                        });

                        copy[setIdx] = {
                            ...existing,
                            variations: updatedVariations,
                            generating: false,
                        };
                        return copy;
                    });
                } else {
                    setPinSets(prev => {
                        const copy = [...prev];
                        const setIdx = copy.findIndex(p => p.articleKeyword === article.keyword);
                        if (setIdx !== -1) copy[setIdx] = { ...copy[setIdx], generating: false };
                        return copy;
                    });
                }
            } catch {
                setPinSets(prev => {
                    const copy = [...prev];
                    const setIdx = copy.findIndex(p => p.articleKeyword === article.keyword);
                    if (setIdx !== -1) copy[setIdx] = { ...copy[setIdx], generating: false };
                    return copy;
                });
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        setGeneratingPins(false);
    }, [writingModel, writingProvider, niche, pinSets.length, autoPopulatePins]);

    // ─── Send data from Content Studio ───
    const addArticlePinData = useCallback((articleKeyword: string, articleTitle: string, pinTitle: string, pinDescription: string) => {
        const newCard: FoodPinCard = {
            variationNumber: 0,
            label: "Sent from Content Studio 📨",
            type: 'from-studio',
            targetKeyword: articleKeyword,
            pinTitle,
            pinDescription,
            destinationUrl: wpUrl || '',
            imageUrl: '',
        };

        setPinSets(prev => {
            const existing = prev.find(p => p.articleKeyword === articleKeyword);
            if (existing) {
                return prev.map(p => p.articleKeyword === articleKeyword
                    ? { ...p, variations: [newCard, ...p.variations.filter(v => v.type !== 'from-studio')] }
                    : p
                );
            }
            return [...prev, {
                articleKeyword,
                articleTitle,
                variations: [newCard],
                generating: false,
            }];
        });
    }, [wpUrl]);

    return {
        pinSets, setPinSets,
        generatingPins,
        autoPopulatePins,
        generatePinsForArticles,
        addArticlePinData,
        autoPopulatedRef,
    };
}
