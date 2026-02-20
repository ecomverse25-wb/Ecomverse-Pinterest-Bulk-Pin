"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, FileText, Image as ImageIcon, Layers, Save, Trash2, Key, Globe, User } from "lucide-react";
import KeywordStrategy from "./KeywordStrategy";
import ContentEngine from "./ContentEngine";
import PinFactory from "./PinFactory";
import PromptSettings from "./PromptSettings";

// Shared Types
export interface KeywordCluster {
    topic: string;
    keywords: string[];
}

export interface Product {
    name: string;
    link: string;
    image: string;
}

export interface ArticleData {
    topic: string;
    title: string;
    content: string; // HTML
    heroImage?: string; // URL for Pin Factory
    wpLink?: string;
}

// Model Options
const AI_MODELS = [
    { value: "gemini-2.0-flash", label: "Google Gemini 2.0 Flash (Recommended)" },
    { value: "gemini-2.5-pro", label: "Google Gemini 2.5 Pro (Advanced)" },
    { value: "replicate", label: "Replicate (Custom Models)" },
];

import { getUser } from "@/lib/supabase";
import { saveUserDataAction, loadUserDataAction } from "@/app/actions/user-data-actions";
import { getUserSettingsAction, updateUserSettingsAction } from "@/app/actions/user-settings-actions";
import { useToast } from "@/components/ui/use-toast";

export default function ArticleWriterTool() {
    // Force Rebuild
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("strategy");

    // Load initial data for Article Writer State
    useEffect(() => {
        const load = async () => {
            const { user } = await getUser();
            if (user) {
                const data = await loadUserDataAction(user.id);
                if (data.clusters) setClusters(data.clusters);
                if (data.products) setProducts(data.products);
                if (data.articles) setGeneratedArticles(data.articles);

                // Load WP Creds if exist (stored in user_data generic store)
                // We assume we might store them as a 'wp_credentials' key
                // But loadUserDataAction returns specific keys. We might need to fetch the raw array or add it.
                // For now, let's load them via the same action if we update the action, OR just fetch them manually.
                // Actually, let's assume loadUserDataAction fetches all keys.
                // Wait, loadUserDataAction filters keys. Let's fix that or use a dedicated method?
                // Simpler: use the generic loader if it returns generic data, but the typed return is restrictive.
                // Let's rely on local storage for WP for now if DB is strict, OR use the 'user_settings' table 
                // but we can't add columns.
                // Solution: We'll add 'wp_credentials' logic to the loadUserDataAction in a future step if needed.
                // PROPOSAL: I will modify loadUserDataAction to return generic JSON for unknown keys?
                // Or just use local storage for WP which is safer for quick fixes than DB migrations.
                // User said "Just fix the error". I will try to save to DB using 'wp_auth' key.
            }
        };
        load();
    }, []);

    // Load API Keys
    useEffect(() => {
        const loadKeys = async () => {
            const { settings } = await getUserSettingsAction();
            if (settings) {
                if (settings.gemini_api_key) setApiKey(settings.gemini_api_key);
                if (settings.replicate_api_key) setReplicateKey(settings.replicate_api_key);
                if (settings.imgbb_api_key) setImgbbKey(settings.imgbb_api_key);
            }
        };
        loadKeys();
    }, []);

    const saveData = async (key: string, value: any) => {
        const { user } = await getUser();
        if (user) {
            await saveUserDataAction(user.id, key, value);
        }
    };

    // Wrappers to save on state change
    const updateClusters = (newClusters: KeywordCluster[]) => {
        setClusters(newClusters);
        saveData('clusters', newClusters);
    };

    const updateProducts = (newProducts: Product[]) => {
        setProducts(newProducts);
        saveData('products', newProducts);
    };

    const updateArticles = (newArticles: ArticleData[]) => {
        setGeneratedArticles(newArticles);
        saveData('articles', newArticles);
    };

    // Global State (Persists across tabs)
    const [apiKey, setApiKey] = useState(""); // Gemini
    const [replicateKey, setReplicateKey] = useState("");
    const [imgbbKey, setImgbbKey] = useState("");
    const [activePinterestToken, setActivePinterestToken] = useState("");

    // Model Selection
    const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");

    // WordPress Creds (Local state for now)
    const [wpUrl, setWpUrl] = useState("");
    const [wpUser, setWpUser] = useState("");
    const [wpPassword, setWpPassword] = useState("");

    // Data
    const [clusters, setClusters] = useState<KeywordCluster[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [generatedArticles, setGeneratedArticles] = useState<ArticleData[]>([]);

    // Key Management Handlers
    const saveKey = async (type: 'gemini' | 'replicate' | 'imgbb', value: string) => {
        if (!value) return;
        let payload = {};
        if (type === 'gemini') payload = { gemini_api_key: value };
        if (type === 'replicate') payload = { replicate_api_key: value };
        if (type === 'imgbb') payload = { imgbb_api_key: value };

        const { success, error } = await updateUserSettingsAction(payload);
        if (success) {
            toast({ title: "Saved", description: `${type.toUpperCase()} API Key saved securely.`, variant: "success" });
        } else {
            console.error(error);
            toast({ title: "Error", description: "Failed to save key.", variant: "destructive" });
        }
    };

    const deleteKey = async (type: 'gemini' | 'replicate' | 'imgbb') => {
        if (!confirm(`Are you sure you want to remove the ${type} API key?`)) return;

        // Update state
        if (type === 'gemini') setApiKey("");
        if (type === 'replicate') setReplicateKey("");
        if (type === 'imgbb') setImgbbKey("");

        let payload = {};
        if (type === 'gemini') payload = { gemini_api_key: null }; // Send null to clear
        if (type === 'replicate') payload = { replicate_api_key: null };
        if (type === 'imgbb') payload = { imgbb_api_key: null };

        // Note: Our Safe-Update action handles partials, so to clear, we might need to send null. 
        // Note: The interface allows string | undefined. 
        // We might need to update the action to allow nulls if we want DB clearing.
        // For now, sending empty string.
        if (type === 'gemini') payload = { gemini_api_key: "" };
        if (type === 'replicate') payload = { replicate_api_key: "" };
        if (type === 'imgbb') payload = { imgbb_api_key: "" };

        await updateUserSettingsAction(payload);
        toast({ title: "Deleted", description: "API Key removed.", variant: "default" });
    };

    const saveWpCreds = () => {
        // Save to LocalStorage for now to ensure persistence without schema changes
        if (typeof window !== "undefined") {
            localStorage.setItem("wp_url", wpUrl);
            localStorage.setItem("wp_user", wpUser);
            localStorage.setItem("wp_password", wpPassword);
            toast({ title: "Saved", description: "WordPress Credentials saved to browser.", variant: "success" });
        }
    };

    useEffect(() => {
        if (typeof window !== "undefined") {
            const url = localStorage.getItem("wp_url");
            const user = localStorage.getItem("wp_user");
            const pass = localStorage.getItem("wp_password");
            if (url) setWpUrl(url);
            if (user) setWpUser(user);
            if (pass) setWpPassword(pass);
        }
    }, []);

    return (
        <div className="space-y-6">
            {/* API Configuration & Settings Header */}
            <Card className="border-l-4 border-l-primary bg-card/50">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 gap-6">

                        {/* Top Row: Provider & Gemini */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex gap-2 items-center">
                                    AI Model (Provider)
                                </label>
                                <select
                                    className="w-full p-2 h-10 rounded-md border bg-background text-sm"
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                >
                                    {AI_MODELS.map(model => (
                                        <option key={model.value} value={model.value}>
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-sm font-medium flex gap-2 items-center">
                                    <Key className="w-3.5 h-3.5 text-primary" /> Gemini API Key
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        className="flex-1 p-2 h-10 rounded-md border bg-background text-sm"
                                        placeholder="sk-..."
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                    />
                                    <Button size="sm" variant="outline" onClick={() => saveKey('gemini', apiKey)} title="Save Key">
                                        <Save className="w-4 h-4 text-green-500" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => deleteKey('gemini')} title="Delete Key">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Collapsible/Extra Keys Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border-t pt-4 border-border/50">
                            {/* Replicate */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex gap-2 items-center">
                                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Replicate API (Optional)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        className="flex-1 p-2 h-10 rounded-md border bg-background text-sm"
                                        placeholder="r8_..."
                                        value={replicateKey}
                                        onChange={(e) => setReplicateKey(e.target.value)}
                                    />
                                    <Button size="sm" variant="ghost" onClick={() => saveKey('replicate', replicateKey)} className="h-10 w-10 p-0 border border-input">
                                        <Save className="w-4 h-4 text-green-500" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => deleteKey('replicate')} className="h-10 w-10 p-0 border border-input">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>

                            {/* ImgBB */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex gap-2 items-center">
                                    <ImageIcon className="w-3.5 h-3.5 text-pink-400" /> ImgBB API (Optional)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        className="flex-1 p-2 h-10 rounded-md border bg-background text-sm"
                                        placeholder="ImgBB Key"
                                        value={imgbbKey}
                                        onChange={(e) => setImgbbKey(e.target.value)}
                                    />
                                    <Button size="sm" variant="ghost" onClick={() => saveKey('imgbb', imgbbKey)} className="h-10 w-10 p-0 border border-input">
                                        <Save className="w-4 h-4 text-green-500" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => deleteKey('imgbb')} className="h-10 w-10 p-0 border border-input">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* WordPress Credentials Section */}
                        <div className="border-t pt-4 border-border/50">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-500" /> WordPress Integration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Website URL</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 h-9 rounded-md border bg-background text-sm"
                                        placeholder="https://mysite.com"
                                        value={wpUrl}
                                        onChange={(e) => setWpUrl(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">WP Username</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 h-9 rounded-md border bg-background text-sm"
                                        placeholder="admin"
                                        value={wpUser}
                                        onChange={(e) => setWpUser(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">App Password</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            className="w-full p-2 h-9 rounded-md border bg-background text-sm"
                                            placeholder="abcd efgh ..."
                                            value={wpPassword}
                                            onChange={(e) => setWpPassword(e.target.value)}
                                        />
                                        <Button size="sm" variant="outline" onClick={saveWpCreds} title="Save WP Info">
                                            <Save className="w-4 h-4 text-blue-500" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-14 bg-muted p-1 rounded-lg">
                    <TabsTrigger value="strategy" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <Layers className="w-5 h-5" />
                        1. Strategy & Data
                    </TabsTrigger>
                    <TabsTrigger value="content" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <FileText className="w-5 h-5" />
                        2. Content Engine
                    </TabsTrigger>
                    <TabsTrigger value="pins" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <ImageIcon className="w-5 h-5" />
                        3. Pin Factory
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <Settings className="w-5 h-5" />
                        Settings
                    </TabsTrigger>
                </TabsList>


                <TabsContent value="strategy">
                    <KeywordStrategy
                        clusters={clusters}
                        setClusters={updateClusters}
                        products={products}
                        setProducts={updateProducts}
                        onNext={() => setActiveTab('content')}
                    />
                </TabsContent>

                <TabsContent value="content">
                    <ContentEngine
                        clusters={clusters}
                        products={products}
                        apiKey={apiKey}
                        wpCredentials={{ url: wpUrl, user: wpUser, password: wpPassword }}
                        articles={generatedArticles}
                        setArticles={updateArticles}
                        onNext={() => setActiveTab('pins')}
                        selectedModel={selectedModel}
                    />
                </TabsContent>

                <TabsContent value="pins">
                    <PinFactory
                        articles={generatedArticles}
                        imgbbKey={imgbbKey}
                        replicateKey={replicateKey}
                    />
                </TabsContent>

                <TabsContent value="settings">
                    <PromptSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
