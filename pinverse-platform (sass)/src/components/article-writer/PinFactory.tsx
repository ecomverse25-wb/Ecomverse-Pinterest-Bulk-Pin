"use client";

import { useState, useEffect } from "react";
import { ArticleData } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, Image as ImageIcon, Check, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useToast } from "@/components/ui/use-toast";
import { generateBulkPinsAction } from "@/app/actions/pin-generation-actions";

interface PinFactoryProps {
    articles: ArticleData[];
    imgbbKey?: string;
    replicateKey?: string;
}

interface PinResult {
    articleTitle: string;
    pinTitle: string;
    pinDescription: string;
    destinationLink: string;
    imageBase64: string;
    imageName: string;
    imgbbUrl?: string; // New: Hosted URL
}

export default function PinFactory({ articles, imgbbKey, replicateKey }: PinFactoryProps) {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<PinResult[]>([]);
    const [currentAction, setCurrentAction] = useState("");
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const { toast } = useToast();

    // Default-select new articles with images
    useEffect(() => {
        const validIndices = articles.map((a, i) => a.heroImage ? i : -1).filter(i => i !== -1);
        setSelectedIndices(validIndices);
    }, [articles]);

    // Helper: Upload to ImgBB
    const uploadToImgbb = async (base64Image: string, apiKey: string): Promise<string | null> => {
        try {
            const formData = new FormData();
            // Remove prefix if present
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
            formData.append("image", base64Data);

            const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                return data.data.url;
            } else {
                console.error("ImgBB Error:", data);
                return null;
            }
        } catch (e) {
            console.error("ImgBB Upload Failed:", e);
            return null;
        }
    };

    const processImages = async () => {
        setProcessing(true);
        setResults([]);
        setProgress(0);

        if (selectedIndices.length === 0) return;

        toast({
            title: "Started",
            description: `Generating Pinterest assets for ${selectedIndices.length} articles...`,
        });

        const selectedArticles = articles.filter((_, i) => selectedIndices.includes(i));
        const articlesWithImages = selectedArticles.filter((a) => a.heroImage);

        try {
            setCurrentAction("Processing images...");

            // Note: Currently utilizing server-side Sharp processing via generateBulkPinsAction.
            // Text overlay customization requires updating the server action (done separately).

            const generatedResults: PinResult[] = [];

            // Process sequentially to handle uploads reliably
            for (let i = 0; i < articlesWithImages.length; i++) {
                const article = articlesWithImages[i];
                setCurrentAction(`Processing "${article.title.substring(0, 15)}..."`);

                // 1. Generate Image (Composite)
                const resBatch = await generateBulkPinsAction([{
                    imageUrl: article.heroImage!,
                    articleTitle: article.title,
                    articleTopic: article.topic,
                }]);

                if (resBatch && resBatch[0] && resBatch[0].success) {
                    const res = resBatch[0];
                    let hostedUrl = undefined;

                    // 2. Upload to ImgBB if key exists
                    if (imgbbKey) {
                        setCurrentAction(`Uploading to ImgBB...`);
                        const url = await uploadToImgbb(res.imageBase64!, imgbbKey);
                        if (url) hostedUrl = url;
                    }

                    generatedResults.push({
                        articleTitle: article.title,
                        pinTitle: article.title,
                        pinDescription: `Check out our guide on ${article.topic}!`,
                        destinationLink: article.wpLink || "https://mysite.com",
                        imageBase64: res.imageBase64!,
                        imageName: res.imageName!,
                        imgbbUrl: hostedUrl
                    });
                }

                setProgress(((i + 1) / articlesWithImages.length) * 100);
            }

            setResults(generatedResults);
            setProgress(100);
            setCurrentAction("Done! Ready to Download.");

            toast({
                title: "Success",
                description: `${generatedResults.length} Pins created!`,
                variant: "success",
            });
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            setCurrentAction(`Error: ${msg}`);
            toast({
                title: "Generation Failed",
                description: msg,
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
        }
    };

    const downloadZip = async () => {
        const zip = new JSZip();

        // CSV Content
        // Headers: Title, Description, Destination Link, Image Filename, Image URL (Hosted)
        let csv = "Title,Description,Destination Link,Image Filename,Hosted Image URL\n";
        results.forEach((r) => {
            const t = r.pinTitle.replace(/"/g, '""');
            const d = r.pinDescription.replace(/"/g, '""');
            csv += `"${t}","${d}",${r.destinationLink},images/${r.imageName},${r.imgbbUrl || ""}\n`;
        });
        zip.file("pinterest-bulk.csv", csv);

        // Images folder
        const imgFolder = zip.folder("images");
        results.forEach((r) => {
            const base64Data = r.imageBase64.split(",")[1];
            imgFolder?.file(r.imageName, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "pinverse-bulk-export.zip");
    };

    // Helper: Convert b64 to Blob for single download
    const b64toBlob = (b64Data: string, contentType = 'image/png', sliceSize = 512) => {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
            {/* Left: Queue & Settings */}
            <Card className="bg-[#0f172a] border-slate-800 text-white shadow-lg h-fit">
                <CardHeader>
                    <CardTitle className="text-yellow-500 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Pin Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Total Articles:</span>
                            <span className="font-bold text-white">{articles.length}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Selected:</span>
                            <span className="font-bold text-yellow-500">{selectedIndices.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">ImgBB Integration:</span>
                            <span className={`font-bold ${imgbbKey ? 'text-green-400' : 'text-slate-500'}`}>
                                {imgbbKey ? 'Active' : 'Not Configured'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={processImages}
                            disabled={processing || selectedIndices.length === 0}
                            className="w-full bg-yellow-500 text-slate-900 hover:bg-yellow-400 font-bold"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {currentAction}
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    Generate Pins
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Queue Selection */}
                    {!processing && results.length === 0 && (
                        <div className="space-y-2 mt-4">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-sm font-medium text-slate-400">Select Articles</span>
                                <div className="space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedIndices(articles.map((a, i) => a.heroImage ? i : -1).filter(i => i !== -1))} className="h-6 text-xs text-slate-500 hover:text-white">All with Images</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedIndices([])} className="h-6 text-xs text-slate-500 hover:text-white">None</Button>
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto border border-slate-800 rounded-md p-2 space-y-1 bg-slate-900/50">
                                {articles.map((article, idx) => {
                                    if (!article.heroImage) return null;
                                    const isSelected = selectedIndices.includes(idx);
                                    return (
                                        <div key={idx} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-yellow-500/10 border border-yellow-500/20' : 'hover:bg-slate-800 border border-transparent'}`} onClick={() => {
                                            if (isSelected) setSelectedIndices(selectedIndices.filter(i => i !== idx));
                                            else setSelectedIndices([...selectedIndices, idx]);
                                        }}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-yellow-500 border-yellow-500' : 'border-slate-600 bg-slate-800'}`}>
                                                {isSelected && <Check className="w-3 h-3 text-slate-900" />}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm font-medium truncate text-slate-200">{article.title}</p>
                                            </div>
                                            <img src={article.heroImage} alt="hero" className="w-8 h-8 rounded object-cover border border-slate-700" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {processing && (
                        <div className="space-y-2 pt-4 border-t border-slate-800">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span className="truncate max-w-[200px]">{currentAction}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-slate-800 [&>div]:bg-yellow-500" />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Right: Results Preview */}
            <Card className="bg-[#0f172a] border-slate-800 text-white shadow-lg">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-green-400" />
                        Generated Assets
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {results.length > 0 ? (
                            <>
                                <div className="flex flex-col gap-4 mb-4 bg-slate-900 p-4 rounded border border-slate-800">
                                    <div className="text-center">
                                        <h3 className="font-bold text-lg text-white">{results.length} Pins Created!</h3>
                                        <p className="text-sm text-slate-400">ZIP includes CSV + Images.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={downloadZip} className="w-full border-green-500 text-green-400 hover:bg-green-500/10">
                                        <Download className="mr-2 h-4 w-4" /> Download ZIP (with CSV)
                                    </Button>
                                    {imgbbKey && (
                                        <p className="text-xs text-center text-green-500 flex justify-center items-center gap-1">
                                            <Globe className="w-3 h-3" /> ImgBB Links included in CSV
                                        </p>
                                    )}
                                </div>

                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {results.map((res, i) => (
                                            <div key={i} className="group relative aspect-[2/3] rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                                                <img
                                                    src={`data:image/png;base64,${res.imageBase64}`}
                                                    alt={res.pinTitle}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white p-4 text-center backdrop-blur-sm">
                                                    <p className="font-bold text-xs line-clamp-2 mb-2">{res.pinTitle}</p>
                                                    <Button size="sm" variant="secondary" onClick={() => saveAs(b64toBlob(res.imageBase64), res.imageName)} className="h-8 w-full text-xs">
                                                        <Download className="w-3 h-3 mr-1" /> Save Image
                                                    </Button>
                                                </div>
                                                {res.imgbbUrl && (
                                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow">
                                                        Hosted
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600 gap-4">
                                <div className="p-4 bg-slate-900 rounded-full">
                                    <ImageIcon className="w-8 h-8 opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium">No pins generated yet</p>
                                    <p className="text-xs max-w-[200px] mt-1">Select articles on the left and click "Generate Pins" to start.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
