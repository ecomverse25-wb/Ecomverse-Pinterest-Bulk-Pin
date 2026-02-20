"use client";

import { useState } from "react";
import { KeywordCluster, Product, ArticleData, WPCredentials } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Check, Share, RefreshCw, ArrowRight, Trash2, FileText, AlertCircle, Clock } from "lucide-react";

import { generateArticleAction } from "@/app/actions/ai-actions";
import { publishPostAction } from "@/app/actions/wp-actions";
import { useToast } from "@/components/ui/use-toast";

interface ContentEngineProps {
    clusters: KeywordCluster[];
    products: Product[];
    apiKey: string;
    wpCredentials: WPCredentials;
    articles: ArticleData[];
    setArticles: (articles: ArticleData[]) => void;
    onNext: () => void;
    selectedModel?: string;
}

import { usePrompts } from "./usePrompts";
import { PromptCategory } from "./prompts";

// ... existing imports


// --- Helper: Status Badge ---
// Using exact user-specified colors/styles

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

export default function ContentEngine({ clusters, products, apiKey, wpCredentials, articles, setArticles, onNext, selectedModel }: ContentEngineProps) {
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

        // 1. Find Matching Products
        const topicLower = selectedTopic.topic.toLowerCase();
        let matched = products.filter(p => p.name.toLowerCase().includes(topicLower));

        // Fallback to random 3 if no match
        if (matched.length === 0 && products.length > 0) {
            matched = products.sort(() => 0.5 - Math.random()).slice(0, 3);
        } else {
            matched = matched.slice(0, 3); // Top 3 matches
        }

        // 2. Construct Prompt
        const productHTML = matched.map(p =>
            `<div class="my-6 p-4 border rounded-lg shadow-sm bg-white max-w-sm mx-auto">
                <img src="${p.image}" alt="${p.name}" class="w-full h-64 object-cover rounded-md mb-4" />
                <h3 class="font-bold text-lg mb-2 text-slate-900">${p.name}</h3>
                <a href="${p.link}" class="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors no-underline">Check Price</a>
             </div>`
        ).join("\n");

        // Simple Heuristic for Category (can be improved with UI selector later)
        let category: PromptCategory = 'general';
        if (topicLower.includes('decor') || topicLower.includes('room') || topicLower.includes('home')) category = 'home_decor';
        else if (topicLower.includes('fashion') || topicLower.includes('outfit') || topicLower.includes('wear') || topicLower.includes('style')) category = 'fashion';
        else if (topicLower.includes('food') || topicLower.includes('recipe') || topicLower.includes('cook') || topicLower.includes('meal')) category = 'food';

        const basePrompt = prompts[category] || prompts['general'];
        const itemCount = 5; // Default for now, could extract from title if needed

        const prompt = basePrompt
            .replace(/{title}/g, selectedTopic.topic)
            .replace(/{itemCount}/g, itemCount.toString())
            .replace(/{date}/g, new Date().toDateString())
            + `\n\nIMPORTANT: You MUST embed the following HTML Product Cards naturally within the body: \n${productHTML}\n\nOutput ONLY HTML code starting with <h1>.`;

        try {
            const result = await generateArticleAction(prompt, apiKey, selectedModel);

            if (result.error || !result.content) {
                throw new Error(result.error || "Generation failed");
            }

            const content = result.content;

            // Extract Title from H1
            const titleMatch = content.match(/<h1>(.*?)<\/h1>/i);
            const title = titleMatch ? titleMatch[1] : selectedTopic.topic; // Basic extraction

            // Extract a Hero Image candidate (first product image or null)
            const heroImage = matched.length > 0 ? matched[0].image : undefined;

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

            {/* Middle: Generator & Preview */}
            <Card className="col-span-2 bg-white dark:bg-slate-950">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Content Studio</CardTitle>
                    {articles.length > 0 && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedIndices(articles.map((_, i) => i))}>All</Button>
                            <Button variant="outline" size="sm" onClick={() => setSelectedIndices([])}>None</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-center bg-muted/30 border border-border p-4 rounded-lg">
                        <div className="flex-1">
                            <span className="text-sm font-medium text-muted-foreground">Chosen Topic: </span>
                            <span className="font-bold text-lg text-foreground">{selectedTopic?.topic || "None"}</span>
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
                            <span className="text-sm font-medium ml-2">{selectedIndices.length} Selected</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Delete Selected</Button>
                                <Button size="sm" onClick={handleBulkPublish} disabled={publishing}>Publish Selected</Button>
                            </div>
                        </div>
                    )}

                    {/* Generated Articles List */}
                    <div className="space-y-4 mt-6">
                        {articles.map((article, idx) => (
                            <Card key={idx} className={`overflow-hidden border transition-all ${selectedIndices.includes(idx) ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border bg-card'}`}>
                                <div className="bg-muted/50 p-3 border-b border-border flex justify-between items-center px-4">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={selectedIndices.includes(idx)}
                                            onChange={() => toggleSelection(idx)}
                                        />
                                        <h3 className="font-bold truncate max-w-md text-foreground">{article.title}</h3>
                                        <StatusBadge status={article.wpStatus} />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-muted-foreground hover:text-destructive"
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
                                {/* Dark/Brand background for content */}
                                <div className="p-8 max-h-[600px] overflow-y-auto text-base prose prose-invert max-w-none bg-card text-foreground rounded-b-lg shadow-inner prose-headings:text-yellow-500 prose-a:text-yellow-400">
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
