"use client";

import { useState } from "react";
import { KeywordCluster, Product, ArticleData, WPCredentials } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Check, Share, RefreshCw, ArrowRight, Trash2, FileText, AlertCircle, Clock, Camera } from "lucide-react";

import { generateArticleAction, matchProductsToSectionsAction, generateSectionImageAction } from "@/app/actions/ai-actions";
import { publishPostAction } from "@/app/actions/wp-actions";
import { useToast } from "@/components/ui/use-toast";

interface ContentEngineProps {
    clusters: KeywordCluster[];
    products: Product[];
    apiKey: string;
    replicateKey?: string;
    wpCredentials: WPCredentials;
    articles: ArticleData[];
    setArticles: (articles: ArticleData[]) => void;
    onNext: () => void;
    selectedModel?: string;
}

import { usePrompts } from "./usePrompts";
import { PromptCategory } from "./prompts";

// --- Stop words for secondary keyword validation ---
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'that', 'this', 'are', 'was',
    'be', 'has', 'had', 'have', 'will', 'would', 'could', 'should', 'may',
    'can', 'do', 'does', 'did', 'not', 'no', 'so', 'if', 'its', 'your',
    'my', 'our', 'their', 'we', 'you', 'he', 'she', 'they', 'me', 'him',
    'her', 'us', 'them', 'what', 'which', 'who', 'whom', 'how', 'when',
    'where', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'than', 'too', 'very', 'just', 'about', 'above',
    'after', 'again', 'also', 'any', 'as', 'before', 'between', 'best',
    'into', 'out', 'over', 'own', 'same', 'then', 'these', 'those', 'up',
]);

// --- Secondary keyword validation: do product name and H2 share any real words? ---
function sharesKeyword(h2Text: string, productName: string): boolean {
    const extractWords = (text: string) =>
        text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    const h2Words = new Set(extractWords(h2Text));
    const productWords = extractWords(productName);
    return productWords.some(w => h2Words.has(w));
}

// --- Extract H2 sections with their following paragraph descriptions ---
function extractSectionsFromHTML(html: string): { heading: string; description: string }[] {
    const sections: { heading: string; description: string }[] = [];
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    let match;
    while ((match = h2Regex.exec(html)) !== null) {
        const heading = match[1].replace(/<[^>]*>/g, '').trim();
        // Grab text after this H2 until the next H2 or end
        const afterH2 = html.slice(match.index + match[0].length);
        const nextH2Idx = afterH2.search(/<h2[^>]*>/i);
        const sectionHTML = nextH2Idx >= 0 ? afterH2.slice(0, nextH2Idx) : afterH2;
        const description = sectionHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
        sections.push({ heading, description });
    }
    return sections;
}

// --- Pinterest 2:3 aspect ratio product card HTML ---
function buildProductCardHTML(product: Product): string {
    const pinUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(product.link)}&media=${encodeURIComponent(product.image)}&description=${encodeURIComponent(product.name)}`;
    return `<div class="article-product-card" style="margin: 1.5rem auto; border: 1px solid #334155; border-radius: 12px; background: #252d3d; max-width: 280px; overflow: hidden;">
        <div style="position: relative; width: 100%; aspect-ratio: 2/3; overflow: hidden;">
            <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
            <a href="${pinUrl}" target="_blank" rel="noopener noreferrer" title="Save to Pinterest" style="position: absolute; top: 0.75rem; right: 0.75rem; width: 36px; height: 36px; background: #e60023; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: transform 0.2s;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.993 3.995-.282 1.193.599 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.091.375-.293 1.199-.334 1.363-.053.225-.174.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.627 0 12-5.373 12-12C24 5.373 18.627 0 12 0z"/></svg>
            </a>
        </div>
        <div style="padding: 0.75rem 1rem 1rem; text-align: center; background: #252d3d;">
            <h3 style="font-weight: 700; font-size: 0.95rem; margin: 0 0 0.5rem; color: #ffffff; line-height: 1.3;">${product.name}</h3>
            <a href="${product.link}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #f0c040; color: #1a1f2e; padding: 0.45rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; text-decoration: none;">Check Price →</a>
        </div>
    </div>`;
}

// --- Placeholder card when no product match (2:3 ratio) ---
function buildPlaceholderCardHTML(h2Text: string): string {
    return `<div class="article-product-card" style="margin: 1.5rem auto; border: 2px dashed #334155; border-radius: 12px; background: #252d3d; max-width: 280px; overflow: hidden;">
        <div style="width: 100%; aspect-ratio: 2/3; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #1e293b 0%, #252d3d 100%);">
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.4;">📷</div>
            <p style="font-size: 0.85rem; color: #94a3b8; margin: 0; padding: 0 1rem; text-align: center; line-height: 1.4;">${h2Text}</p>
        </div>
        <div style="padding: 0.5rem 1rem; text-align: center; background: #252d3d;">
            <span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px; background: #334155; color: #94a3b8; font-size: 0.7rem;">AI Generated Image</span>
        </div>
    </div>`;
}

// --- AI-generated image card (2:3 ratio) ---
function buildAIImageCardHTML(imageUrl: string, h2Text: string): string {
    return `<div class="article-product-card" style="margin: 1.5rem auto; border: 1px solid #334155; border-radius: 12px; background: #252d3d; max-width: 280px; overflow: hidden;">
        <div style="position: relative; width: 100%; aspect-ratio: 2/3; overflow: hidden;">
            <img src="${imageUrl}" alt="${h2Text}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        </div>
        <div style="padding: 0.5rem 1rem; text-align: center; background: #252d3d;">
            <span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px; background: #334155; color: #94a3b8; font-size: 0.7rem;">✨ AI Generated</span>
        </div>
    </div>`;
}

// --- Inject product cards DIRECTLY after each </h2> tag using pre-matched map ---
function injectProductCards(
    html: string,
    sectionProductMap: Map<number, Product>,
    sectionImageMap: Map<number, string>
): string {
    // Find all <h2>...</h2> tags with their full match positions
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const h2Matches: { text: string; fullMatchEnd: number }[] = [];
    let match;
    while ((match = h2Regex.exec(html)) !== null) {
        const plainText = match[1].replace(/<[^>]*>/g, '').trim();
        h2Matches.push({ text: plainText, fullMatchEnd: match.index + match[0].length });
    }

    if (h2Matches.length === 0) return html;

    const injections: { position: number; cardHTML: string }[] = [];

    for (let i = 0; i < h2Matches.length; i++) {
        const h2 = h2Matches[i];
        const matchedProduct = sectionProductMap.get(i);
        const aiImageUrl = sectionImageMap.get(i);

        let cardHTML: string;
        if (matchedProduct) {
            cardHTML = buildProductCardHTML(matchedProduct);
        } else if (aiImageUrl) {
            cardHTML = buildAIImageCardHTML(aiImageUrl, h2.text);
        } else {
            cardHTML = buildPlaceholderCardHTML(h2.text);
        }

        injections.push({ position: h2.fullMatchEnd, cardHTML });
    }

    // Insert from end to start so positions stay valid
    let result = html;
    for (let i = injections.length - 1; i >= 0; i--) {
        const { position, cardHTML } = injections[i];
        result = result.slice(0, position) + '\n' + cardHTML + '\n' + result.slice(position);
    }

    return result;
}

// --- Sanitize rendered content for dark theme ---
function sanitizeContent(html: string): string {
    let cleaned = html;

    // Strip code fences: ```html, ```, etc.
    cleaned = cleaned.replace(/```[\w]*\s*/g, '').replace(/```/g, '');

    // Remove lines that are only asterisks, dashes, or horizontal rules
    cleaned = cleaned.replace(/^\s*[\*\-]{3,}\s*$/gm, '');
    cleaned = cleaned.replace(/<hr\s*\/?>/gi, '');

    // Remove empty paragraphs left behind
    cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');

    // Style H1 white, H2 gold
    cleaned = cleaned.replace(/<h1([^>]*)>/gi, '<h1$1 style="color: #ffffff;">');
    cleaned = cleaned.replace(/<h2([^>]*)>/gi, '<h2$1 style="color: #f0c040;">');

    // Fix any inline product cards that Gemini might have generated with light bg
    cleaned = cleaned.replace(/bg-white/g, 'bg-[#252d3d]');
    cleaned = cleaned.replace(/text-slate-900/g, 'text-white');

    return cleaned;
}


// --- Helper: Status Badge ---
const StatusBadge = ({ status }: { status: ArticleData['wpStatus'] }) => {
    const variants = {
        'published': { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: Check, label: 'Published' },
        'publish': { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: Check, label: 'Published' },
        'draft': { bg: 'bg-green-500/10', text: 'text-green-500', icon: FileText, label: 'WP Draft' },
        'failed': { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertCircle, label: 'Failed' },
        'unsent': { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock, label: 'Ready' }
    };

    const config = variants[status || 'unsent'] || variants['unsent'];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text} text-xs font-bold border border-current/20`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
};

export default function ContentEngine({ clusters, products, apiKey, replicateKey, wpCredentials, articles, setArticles, onNext, selectedModel }: ContentEngineProps) {
    const [selectedTopic, setSelectedTopic] = useState<KeywordCluster | null>(null);
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const { toast } = useToast();

    // Load prompts
    const { prompts } = usePrompts();

    // --- Undoable Delete ---
    const handleDeleteArticle = (index: number) => {
        const deleted = articles[index];
        const updated = articles.filter((_, i) => i !== index);

        // Optimistic Update
        setArticles(updated);

        toast({
            title: "Article Deleted",
            description: `Deleted "${deleted.title}"`,
            action: (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        // Undo: Insert back at original index
                        const restored = [...updated];
                        restored.splice(index, 0, deleted);
                        setArticles(restored);
                    }}
                >
                    Undo
                </Button>
            ),
        });
    };



    const handleGenerate = async () => {
        if (!selectedTopic || !apiKey) {
            toast({ title: "Missing Information", description: "Please select a topic and ensure API Key is set.", variant: "destructive" });
            return;
        }

        setGenerating(true);
        toast({ title: "Started", description: `Generating article with ${selectedModel || 'Gemini'}...` });

        // Extract item count from topic title (e.g. "10 Best Kitchen Ideas" → 10)
        const numberMatch = selectedTopic.topic.match(/(\d+)/);
        const itemCount = numberMatch ? parseInt(numberMatch[1], 10) : 5;

        // Simple Heuristic for Category
        const topicLower = selectedTopic.topic.toLowerCase();
        let category: PromptCategory = 'general';
        if (topicLower.includes('decor') || topicLower.includes('room') || topicLower.includes('home')) category = 'home_decor';
        else if (topicLower.includes('fashion') || topicLower.includes('outfit') || topicLower.includes('wear') || topicLower.includes('style')) category = 'fashion';
        else if (topicLower.includes('food') || topicLower.includes('recipe') || topicLower.includes('cook') || topicLower.includes('meal')) category = 'food';

        const basePrompt = prompts[category] || prompts['general'];

        const prompt = basePrompt
            .replace(/{title}/g, selectedTopic.topic)
            .replace(/{itemCount}/g, itemCount.toString())
            .replace(/{date}/g, new Date().toDateString())
            + `\n\nIMPORTANT: Do NOT include any product cards, affiliate links, or images in the article. Just write the pure article content with proper HTML headings and paragraphs. Product cards will be inserted automatically.\n\nOutput ONLY HTML code starting with <h1>.`;

        try {
            const result = await generateArticleAction(prompt, apiKey, selectedModel);

            if (result.error || !result.content) {
                throw new Error(result.error || "Generation failed");
            }

            let content = result.content;

            // Sanitize: strip code fences, apply dark heading styles
            content = sanitizeContent(content);

            // Extract Title from H1
            const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : selectedTopic.topic;

            // --- AI-powered product matching ---
            const sections = extractSectionsFromHTML(content);
            const sectionProductMap = new Map<number, Product>();
            const sectionImageMap = new Map<number, string>();

            if (sections.length > 0 && products.length > 0) {
                const matchResult = await matchProductsToSectionsAction(
                    title,
                    selectedTopic.topic,
                    sections,
                    products.map(p => p.name),
                    apiKey,
                    selectedModel
                );

                if (matchResult.success && matchResult.matches) {
                    for (const m of matchResult.matches) {
                        if (m.productIndex !== null && m.productIndex >= 0 && m.productIndex < products.length) {
                            const product = products[m.productIndex];
                            const heading = sections[m.sectionIndex]?.heading || '';
                            // Secondary keyword validation: reject if zero shared keywords
                            if (sharesKeyword(heading, product.name)) {
                                sectionProductMap.set(m.sectionIndex, product);
                            } else {
                                console.warn(`Keyword check rejected: "${product.name}" for H2 "${heading}"`);
                            }
                        }
                    }
                } else if (matchResult.error) {
                    console.warn("AI product matching failed, using placeholders:", matchResult.error);
                }
            }

            // --- Generate AI images for unmatched sections (if Replicate key available) ---
            if (replicateKey && sections.length > 0) {
                const unmatchedIndices = sections
                    .map((_, i) => i)
                    .filter(i => !sectionProductMap.has(i));

                // Generate images in parallel (max 5 at a time to avoid overload)
                const batch = unmatchedIndices.slice(0, 5);
                const imageResults = await Promise.allSettled(
                    batch.map(i =>
                        generateSectionImageAction(
                            sections[i].heading,
                            selectedTopic.topic,
                            replicateKey
                        ).then(res => ({ index: i, result: res }))
                    )
                );

                for (const settled of imageResults) {
                    if (settled.status === 'fulfilled' && settled.value.result.success && settled.value.result.imageUrl) {
                        sectionImageMap.set(settled.value.index, settled.value.result.imageUrl);
                    }
                }
            }

            // Inject product cards after each H2 section using AI matches
            content = injectProductCards(content, sectionProductMap, sectionImageMap);

            // Extract a Hero Image candidate (first product image or null)
            const heroImage = products.length > 0 ? products[0].image : undefined;

            const newArticle: ArticleData = {
                topic: selectedTopic.topic,
                title: title,
                content: content,
                heroImage: heroImage,
                wpStatus: 'unsent'
            };

            setArticles([...articles, newArticle]);
            toast({ title: "Success", description: "Article successfully generated!", variant: "success" });
        } catch (error: unknown) {

            console.error(error);
            const msg = error instanceof Error ? error.message : "Unknown error";
            toast({ title: "Generation Failed", description: msg, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const publishToWP = async (article: ArticleData, index: number) => {
        if (!wpCredentials.url || !wpCredentials.user || !wpCredentials.password) {
            toast({ title: "Error", description: "Missing WordPress Credentials in Strategy/Settings.", variant: "destructive" });
            return;
        }

        setPublishing(true);
        toast({ title: "Publishing", description: "Sending to WordPress..." });

        try {
            // Use Server Action instead of Client Service
            const result = await publishPostAction(article, wpCredentials);

            if (result.error || !result.link) {
                throw new Error(result.error || "Failed to publish post");
            }

            // Update article status
            const updated = [...articles];
            updated[index] = {
                ...article,
                wpLink: result.link,
                wpStatus: 'draft'
            };
            setArticles(updated);
            toast({ title: "Published", description: "Article saved as draft in WordPress.", variant: "success" });

        } catch (error: unknown) {

            console.error(error);
            const msg = error instanceof Error ? error.message : "Unknown error";
            toast({ title: "Publish Error", description: msg, variant: "destructive" });
            const updated = [...articles];
            updated[index] = { ...article, wpStatus: 'failed' };
            setArticles(updated);
        } finally {
            setPublishing(false);
        }
    };

    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    // --- Bulk Actions ---
    const toggleSelection = (index: number) => {
        if (selectedIndices.includes(index)) {
            setSelectedIndices(selectedIndices.filter(i => i !== index));
        } else {
            setSelectedIndices([...selectedIndices, index]);
        }
    };

    const handleBulkDelete = () => {
        const remaining = articles.filter((_, i) => !selectedIndices.includes(i));
        const deletedCount = articles.length - remaining.length;
        setArticles(remaining);
        setSelectedIndices([]);

        toast({ title: "Bulk Delete", description: `Removed ${deletedCount} articles.` });
    };

    const handleBulkPublish = async () => {
        const toPublishIndices = selectedIndices.filter(i => articles[i].wpStatus !== 'publish' && articles[i].wpStatus !== 'published');

        if (toPublishIndices.length === 0) {
            toast({ title: "Info", description: "No selected articles need publishing." });
            return;
        }

        setPublishing(true);
        toast({ title: "Bulk Publish", description: `Publishing ${toPublishIndices.length} articles...` });

        // Sequential publish to avoid overwhelming server
        for (const idx of toPublishIndices) {
            await publishToWP(articles[idx], idx);
        }

        setPublishing(false);
        toast({ title: "Done", description: "Bulk publishing complete." });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Left: Topic Selector */}
            <Card className="col-span-1 bg-[#0f172a] border-slate-800 text-white shadow-lg">
                <CardHeader>
                    <CardTitle className="text-yellow-500">Select Topic</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px]">
                        {clusters.map((c, i) => (
                            <div
                                key={i}
                                onClick={() => setSelectedTopic(c)}
                                className={`p-3 mb-2 rounded-lg cursor-pointer border transition-colors ${selectedTopic?.topic === c.topic ? 'bg-primary/10 border-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-900'} text-foreground border-border`}
                            >
                                <div className="font-semibold">{c.topic}</div>
                                <div className="text-xs text-muted-foreground">{c.keywords.length} keywords</div>
                            </div>
                        ))}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Middle: Generator & Preview — Dark Theme */}
            <Card className="col-span-2 bg-gray-800 border border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">Content Studio</CardTitle>
                    {articles.length > 0 && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedIndices(articles.map((_, i) => i))}>All</Button>
                            <Button variant="outline" size="sm" onClick={() => setSelectedIndices([])}>None</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-center bg-gray-900/50 border border-gray-700 p-4 rounded-lg">
                        <div className="flex-1">
                            <span className="text-sm font-medium text-gray-400">Chosen Topic: </span>
                            <span className="font-bold text-lg text-white">{selectedTopic?.topic || "None"}</span>
                        </div>
                        <Button
                            onClick={handleGenerate}
                            disabled={generating || !selectedTopic}
                            className="w-40"
                        >
                            {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                            Generate Article
                        </Button>
                    </div>

                    {/* Bulk Action Bar */}
                    {selectedIndices.length > 0 && (
                        <div className="flex items-center justify-between bg-primary/5 p-3 rounded-md border border-primary/20 animate-in fade-in slide-in-from-top-2">
                            <span className="text-sm font-medium ml-2 text-white">{selectedIndices.length} Selected</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Delete Selected</Button>
                                <Button size="sm" onClick={handleBulkPublish} disabled={publishing}>Publish Selected</Button>
                            </div>
                        </div>
                    )}

                    {/* Generated Articles List */}
                    <div className="space-y-4 mt-6">
                        {articles.map((article, idx) => (
                            <Card key={idx} className={`overflow-hidden border transition-all ${selectedIndices.includes(idx) ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-gray-700 bg-gray-800'}`}>
                                <div className="bg-gray-900/50 p-3 border-b border-gray-700 flex justify-between items-center px-4">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary"
                                            checked={selectedIndices.includes(idx)}
                                            onChange={() => toggleSelection(idx)}
                                        />
                                        <h3 className="font-bold truncate max-w-md text-white">{article.title}</h3>
                                        <StatusBadge status={article.wpStatus} />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-gray-400 hover:text-destructive"
                                            onClick={() => handleDeleteArticle(idx)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant={article.wpStatus === 'draft' ? "outline" : "default"}
                                            className={article.wpStatus !== 'draft' ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                                            onClick={() => publishToWP(article, idx)}
                                            disabled={publishing || article.wpStatus === 'draft'}
                                        >
                                            {article.wpStatus === 'draft'
                                                ? <span className="text-green-600 dark:text-green-400 flex items-center"><Check className="w-3 h-3 mr-1" /> Draft Saved</span>
                                                : <span className="flex items-center"><Share className="w-3 h-3 mr-1" /> Send to WP</span>
                                            }
                                        </Button>
                                    </div>
                                </div>
                                {/* Dark themed article preview */}
                                <div className="p-8 max-h-[600px] overflow-y-auto text-base max-w-none bg-[#1a1f2e] text-[#e2e8f0] rounded-b-lg shadow-inner"
                                    style={{ lineHeight: '1.8' }}
                                >
                                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                                </div>
                            </Card>
                        ))}
                    </div>

                    {articles.length > 0 && (
                        <div className="flex justify-end mt-4">
                            <Button onClick={onNext} variant="secondary">
                                Go to Pin Factory <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
