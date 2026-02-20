/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";


import { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { KeywordCluster, Product } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowRight, Save, Database, Trash2, FileSpreadsheet } from "lucide-react";
import { saveKeywordFileAction, getUserKeywordsAction, deleteKeywordFileAction, saveProductsAction, DBKeywordFile, getUserProductBatchesAction, getProductsInBatchAction, deleteProductBatchAction } from "@/app/actions/user-actions";
import { useToast } from "@/components/ui/use-toast";

interface KeywordStrategyProps {
    clusters: KeywordCluster[];
    setClusters: (clusters: KeywordCluster[]) => void;
    products: Product[];
    setProducts: (products: Product[]) => void;
    onNext: () => void;
}

export default function KeywordStrategy({ clusters, setClusters, products, setProducts, onNext }: KeywordStrategyProps) {
    const [loading, setLoading] = useState(false);
    const [savedFiles, setSavedFiles] = useState<DBKeywordFile[]>([]);
    const [savedProductBatches, setSavedProductBatches] = useState<{ batch_name: string, created_at: string }[]>([]);
    const [status, setStatus] = useState("");
    const { toast } = useToast();

    // Load saved files on mount
    useEffect(() => {
        loadSavedFiles();
    }, []);

    const loadSavedFiles = async () => {
        try {
            const [keywordsRes, productsRes] = await Promise.all([
                getUserKeywordsAction(),
                getUserProductBatchesAction()
            ]);

            if (keywordsRes.success && keywordsRes.data) {
                setSavedFiles(keywordsRes.data);
            }

            if (productsRes.success && productsRes.data) {
                setSavedProductBatches(productsRes.data);
            }

        } catch (e) {
            console.error("Failed to load user files", e);
        }
    };

    const handleKeywordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStatus(`Parsing ${file.name}...`);

        let rawKeywords: string[] = [];

        try {
            if (file.name.endsWith(".csv")) {
                Papa.parse(file, {
                    complete: (results) => {
                        rawKeywords = results.data.flat().filter(k => typeof k === 'string' && k.length > 2) as string[];
                        finishUpload(rawKeywords, file.name);
                    },
                    header: false,
                    skipEmptyLines: true
                });
                return; // Papa is async callback
            } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                rawKeywords = json.flat().filter((k: any) => typeof k === 'string' && k.length > 2) as string[];
            } else if (file.name.endsWith(".txt")) {
                const text = await file.text();
                rawKeywords = text.split('\n').map(k => k.trim()).filter(k => k.length > 2);
            } else if (file.name.endsWith(".docx")) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                rawKeywords = result.value.split('\n').map(k => k.trim()).filter(k => k.length > 2);
            } else {
                throw new Error("Unsupported file format. Please use CSV, Excel, TXT, or DOCX.");
            }

            // For non-CSV sync/async awaits
            finishUpload(rawKeywords, file.name);

        } catch (error: any) {
            console.error("Upload Error:", error);
            setStatus("Error parsing file");
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
            setLoading(false);
        }
    };

    const finishUpload = async (keywords: string[], filename: string) => {
        if (keywords.length === 0) {
            setLoading(false);
            setStatus("No keywords found");
            return;
        }

        const newClusters = simpleCluster(keywords);
        setClusters(newClusters);
        setLoading(false);
        setStatus("Clustered! Saving to DB...");

        // Auto-save to DB
        try {
            const result = await saveKeywordFileAction(filename, newClusters);
            if (result.success) {
                await loadSavedFiles();
                setStatus("Saved to Database!");
                toast({ title: "Saved", description: "Keywords saved to database.", variant: "success" });
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error("Failed to save", e);
            setStatus("Error saving to DB");
            const msg = e instanceof Error ? e.message : "Unknown error";
            toast({ title: "Save Failed", description: msg, variant: "destructive" });
        }
    };

    const handleLoadFile = (file: DBKeywordFile) => {
        setClusters(file.content);
        setStatus(`Loaded ${file.filename}`);
    };

    const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this file?")) return;
        try {
            const result = await deleteKeywordFileAction(id);
            if (result.success) {
                await loadSavedFiles();
                toast({ title: "Deleted", description: "File deleted.", variant: "success" });
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
        }
    };

    const handleLoadProductBatch = async (batch: { batch_name: string, created_at: string }) => {
        setLoading(true);
        setStatus("Loading products...");
        try {
            const result = await getProductsInBatchAction(batch.batch_name, batch.created_at);
            if (result.success && result.data) {
                setProducts(result.data);
                setStatus(`Loaded ${result.data.length} products`);
                toast({ title: "Loaded", description: `${result.data.length} products loaded.`, variant: "success" });
            } else {
                throw new Error(result.error || "Failed to load");
            }
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load products.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProductBatch = async (batch: { batch_name: string, created_at: string }, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this product list?")) return;

        try {
            const result = await deleteProductBatchAction(batch.batch_name, batch.created_at);
            if (result.success) {
                await loadSavedFiles(); // Refresh list
                toast({ title: "Deleted", description: "Product list deleted.", variant: "success" });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
        }
    };

    // --- Strict Parsers ---
    const processProductData = async (data: any[], filename: string) => {
        // --- Helper: Normalize Header ---
        const normalizeHeader = (header: string): string => {
            return String(header || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .replace(/\s+/g, '');
        };

        const HEADER_ALIASES = {
            name: ['name', 'productname', 'title', 'product', 'itemname', 'item', 'label'],
            link: ['link', 'url', 'productlink', 'producturl', 'affiliatelink', 'href', 'destinationurl', 'permalink'],
            image: ['image', 'imageurl', 'img', 'picture', 'photo', 'thumbnail', 'src', 'imagesrc']
        };

        const getValue = (obj: any, category: keyof typeof HEADER_ALIASES) => {
            const possibleKeys = HEADER_ALIASES[category];

            // 1. Try mapping via keys
            for (const objKey of Object.keys(obj)) {
                const normalized = normalizeHeader(objKey);
                if (possibleKeys.some(pk => normalizeHeader(pk) === normalized)) {
                    const val = obj[objKey];
                    if (val && String(val).trim().length > 0) {
                        return String(val).trim();
                    }
                }
            }
            return undefined;
        };

        // --- 1. Filter Invalid Rows First ---
        const validRows = data.filter((row: any) => {
            // Must have at least SOME data
            return row && typeof row === 'object' && Object.values(row).some(v => v && String(v).trim().length > 0);
        });

        // --- 2. Map Data ---
        const parsedProducts: Product[] = validRows.map((row: any) => {
            let name = getValue(row, 'name');
            let link = getValue(row, 'link');
            let image = getValue(row, 'image');

            // Fallback for Array-based rows (no headers)
            if (Array.isArray(row)) {
                name = String(row[0] || '');
                link = String(row[1] || '');
                image = String(row[2] || '');
            } else if (!name && !link && !image) {
                // Extreme fallback: assume positional if keys failed completely but it's an object with values
                const values = Object.values(row);
                if (values.length >= 3) {
                    name = String(values[0]);
                    link = String(values[1]);
                    image = String(values[2]);
                }
            }

            return { name: name || '', link: link || '', image: image || '' };
        }).filter((p: Product) => p.name && p.name.length > 1 && (p.link.length > 4 || p.image.length > 4));

        if (parsedProducts.length === 0) {
            // Show user WHAT headers were found for debugging
            const firstRow = data[0] || {};
            const foundHeaders = Object.keys(firstRow).join(", ");
            console.error("Found headers:", foundHeaders);

            toast({
                title: "No Valid Products Found",
                description: `Checked ${data.length} rows. Expected headers: Name, Link, Image. Found: ${foundHeaders.substring(0, 50)}...`,
                variant: "destructive"
            });
            return;
        }

        setProducts(parsedProducts);

        try {
            const result = await saveProductsAction(parsedProducts, filename);
            if (result.success) {
                setStatus(`Uploaded ${parsedProducts.length} products to DB`);
                toast({ title: "Success", description: `${parsedProducts.length} products saved to DB.`, variant: "success" });
                loadSavedFiles(); // Refresh list
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error("Product save failed", e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            const time = new Date().toLocaleTimeString();
            toast({ title: `Save Failed (${time})`, description: msg, variant: "destructive" });
        }
    };

    const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                processProductData(data, file.name);
            };
            reader.readAsBinaryString(file);
        } else {
            // CSV Fallback
            Papa.parse(file, {
                complete: (results) => {
                    processProductData(results.data, file.name);
                },
                header: true,
                skipEmptyLines: true
            });
        }
    };

    // A very basic text clustering function
    const simpleCluster = (keywords: string[]): KeywordCluster[] => {
        const clusters: Record<string, string[]> = {};

        keywords.forEach(keyword => {
            const clean = keyword.toLowerCase().trim();
            const words = clean.split(' ');
            const topic = words.slice(0, 2).join(' ');

            if (!clusters[topic]) {
                clusters[topic] = [];
            }
            clusters[topic].push(keyword);
        });

        return Object.entries(clusters)
            .map(([topic, kws]) => ({ topic: topic.toUpperCase(), keywords: kws }))
            .sort((a, b) => b.keywords.length - a.keywords.length);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col h-full bg-card dark:bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            1. Keywords Data
                        </div>
                        {status && <Badge variant="outline" className="text-xs bg-card text-foreground">{status}</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                    {/* Saved Files List */}
                    {savedFiles.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4" /> Your Saved Lists
                            </h4>
                            <ScrollArea className="h-32 border rounded-md bg-card text-foreground">
                                <div className="p-2 space-y-1">
                                    {savedFiles.map(file => (
                                        <div
                                            key={file.id}
                                            onClick={() => handleLoadFile(file)}
                                            className="flex items-center gap-3 p-2 text-sm hover:bg-muted/50 cursor-pointer rounded group transition-colors"
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                                                onClick={(e) => handleDeleteFile(file.id, e)}
                                                title="Delete File"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>

                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Save className="w-3 h-3 text-emerald-500 shrink-0" />
                                                <span className="truncate font-medium">{file.filename}</span>
                                                <span className="text-xs text-muted-foreground shrink-0">({new Date(file.created_at).toLocaleDateString()})</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer relative shrink-0 transition-colors bg-card">
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls, .txt, .docx"
                            onChange={handleKeywordUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2">
                            <p className="font-medium text-foreground">Upload New CSV</p>
                            <p className="text-xs text-muted-foreground">Supports CSV, Excel, TXT, DOCX</p>
                        </div>
                    </div>

                    {loading && <p className="text-sm text-center animate-pulse text-muted-foreground">Processing...</p>}

                    {clusters.length > 0 && (
                        <div className="bg-muted/30 p-4 rounded-md flex-1 min-h-[150px] overflow-y-auto border border-border">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-foreground">Active Clusters ({clusters.length})</h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        if (confirm("Clear all active clusters?")) setClusters([]);
                                    }}
                                    className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                    Clear All
                                </Button>
                            </div>
                            <ul className="space-y-2 text-sm">
                                {clusters.map((c, i) => (
                                    <li key={i} className="flex justify-between items-center p-2 bg-card rounded border border-border shadow-sm group">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                                                onClick={() => {
                                                    const newClusters = [...clusters];
                                                    newClusters.splice(i, 1);
                                                    setClusters(newClusters);
                                                }}
                                                title="Delete Cluster"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <span className="text-foreground truncate font-medium bg-transparent border-none focus:outline-none">{c.topic}</span>
                                        </div>
                                        <span className="text-muted-foreground text-xs shrink-0 bg-secondary/50 px-2 py-0.5 rounded-full">{c.keywords.length} kw</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="flex flex-col h-full bg-card dark:bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        2. Product Database
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                    {/* Saved Products List */}
                    {savedProductBatches.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4" /> Your Saved Product Lists
                            </h4>
                            <ScrollArea className="h-32 border rounded-md bg-card text-foreground">
                                <div className="p-2 space-y-1">
                                    {savedProductBatches.map((batch, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleLoadProductBatch(batch)}
                                            className="flex items-center gap-3 p-2 text-sm hover:bg-muted/50 cursor-pointer rounded group transition-colors"
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                                                onClick={(e) => handleDeleteProductBatch(batch, e)}
                                                title="Delete List"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>

                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Save className="w-3 h-3 text-blue-500 shrink-0" />
                                                <span className="truncate font-medium">{batch.batch_name}</span>
                                                <span className="text-xs text-muted-foreground shrink-0">({new Date(batch.created_at).toLocaleDateString()})</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer relative shrink-0 transition-colors bg-card">
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            onChange={handleProductUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2">
                            <p className="font-medium text-foreground">Upload Products</p>
                            <p className="text-xs text-muted-foreground">Supports CSV, Excel (.xlsx, .xls)</p>
                            <p className="text-xs text-muted-foreground">Headers: Name, Link, Image</p>
                        </div>
                    </div>

                    {products.length > 0 ? (
                        <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-md flex-1 flex flex-col items-center justify-center border border-green-100 dark:border-green-900">
                            <h4 className="font-semibold mb-2 text-green-800 dark:text-green-400">Active Session Products</h4>
                            <p className="text-5xl font-bold text-green-600 dark:text-green-500 my-4">{products.length}</p>
                            <p className="text-sm text-green-700 dark:text-green-300 text-center">Ready for matching in Content Engine.</p>
                        </div>
                    ) : (
                        <div className="bg-muted/30 p-6 rounded-md flex-1 flex items-center justify-center border border-border text-muted-foreground text-sm">
                            <p>No products loaded yet.</p>
                        </div>
                    )}

                    <div className="pt-4 mt-auto flex justify-end">
                        <Button
                            onClick={onNext}
                            disabled={clusters.length === 0}
                            className="w-full md:w-auto"
                        >
                            Continue to Content Engine <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
