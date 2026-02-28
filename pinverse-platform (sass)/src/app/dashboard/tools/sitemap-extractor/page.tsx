"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, Download, FileText, AlertTriangle, Loader2, Search, ExternalLink, CheckCircle2 } from "lucide-react";
import { extractBatch, type ExtractedProduct } from "@/app/actions/sitemap-extractor/extract";
import * as XLSX from "xlsx";

// ── Types ──────────────────────────────────────────────────────────
type DetectedMode = "xml" | "csv" | "excel" | null;

interface ParseResult {
    mode: DetectedMode;
    /** URLs that need scraping */
    urlsToScrape: string[];
    /** Products already complete (no scraping needed) */
    readyProducts: ExtractedProduct[];
    label: string;
}

// ── Column mapping helpers ─────────────────────────────────────────
const NAME_COLS = ["name", "title", "product", "product name", "product_name", "product title"];
const LINK_COLS = ["link", "url", "href", "product url", "product_url", "product link", "product_link"];
const IMAGE_COLS = ["image", "img", "image url", "image_url", "thumbnail", "photo", "picture"];

function findCol(headers: string[], candidates: string[]): number {
    const lower = headers.map((h) => h.toLowerCase().trim());
    for (const c of candidates) {
        const idx = lower.indexOf(c);
        if (idx !== -1) return idx;
    }
    return -1;
}

// ── Tabular data parser (works for both CSV rows and Excel rows) ──
function parseTabularRows(
    headers: string[],
    rows: string[][]
): ParseResult {
    const nameIdx = findCol(headers, NAME_COLS);
    const linkIdx = findCol(headers, LINK_COLS);
    const imageIdx = findCol(headers, IMAGE_COLS);

    const hasName = nameIdx !== -1;
    const hasLink = linkIdx !== -1;
    const hasImage = imageIdx !== -1;

    // Complete product data — no scraping needed
    if (hasName && hasLink) {
        const products: ExtractedProduct[] = rows
            .filter((r) => r[linkIdx]?.trim())
            .map((r) => ({
                name: r[nameIdx]?.trim() || "",
                link: r[linkIdx]?.trim() || "",
                image: hasImage ? (r[imageIdx]?.trim() || "") : "",
            }));
        if (products.length === 0) {
            return { mode: null, urlsToScrape: [], readyProducts: [], label: "" };
        }
        return {
            mode: "csv",
            urlsToScrape: [],
            readyProducts: products,
            label: `Found ${products.length} product${products.length !== 1 ? "s" : ""} ready to export`,
        };
    }

    // Only URLs column found — need scraping
    if (hasLink) {
        const urls = rows
            .map((r) => r[linkIdx]?.trim())
            .filter((u): u is string => !!u && (u.startsWith("http://") || u.startsWith("https://")));
        if (urls.length === 0) {
            return { mode: null, urlsToScrape: [], readyProducts: [], label: "" };
        }
        return {
            mode: "csv",
            urlsToScrape: urls,
            readyProducts: [],
            label: `Found ${urls.length} URL${urls.length !== 1 ? "s" : ""} to scrape`,
        };
    }

    // Check if first column has URLs (no header match but data looks like URLs)
    const urlCol = rows
        .map((r) => r[0]?.trim())
        .filter((u): u is string => !!u && (u.startsWith("http://") || u.startsWith("https://")));
    if (urlCol.length > 0) {
        return {
            mode: "csv",
            urlsToScrape: urlCol,
            readyProducts: [],
            label: `Found ${urlCol.length} URL${urlCol.length !== 1 ? "s" : ""} to scrape`,
        };
    }

    return { mode: null, urlsToScrape: [], readyProducts: [], label: "" };
}

// ── CSV text parser ────────────────────────────────────────────────
function parseCSVText(text: string): ParseResult {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
        return { mode: null, urlsToScrape: [], readyProducts: [], label: "" };
    }
    const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
    const rows = lines.slice(1).map((line) => {
        // Basic CSV split (handles quoted fields)
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
                result.push(current);
                current = "";
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    });
    return parseTabularRows(headers, rows);
}

// ── Excel parser ───────────────────────────────────────────────────
function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return { mode: null, urlsToScrape: [], readyProducts: [], label: "" };
    }
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    if (data.length < 2) {
        return { mode: null, urlsToScrape: [], readyProducts: [], label: "" };
    }
    const headers = (data[0] as string[]).map((h) => String(h ?? ""));
    const rows = data.slice(1).map((row) => (row as string[]).map((c) => String(c ?? "")));
    const result = parseTabularRows(headers, rows);
    result.mode = "excel";
    return result;
}

// ── XML parser ─────────────────────────────────────────────────────
function parseXMLText(text: string): ParseResult {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");
    const locElements = xml.getElementsByTagName("loc");
    const urls: string[] = [];
    for (let i = 0; i < locElements.length; i++) {
        const url = locElements[i].textContent?.trim();
        if (url) urls.push(url);
    }
    if (urls.length === 0) {
        return { mode: null, urlsToScrape: [], readyProducts: [], label: "" };
    }
    return {
        mode: "xml",
        urlsToScrape: urls,
        readyProducts: [],
        label: `Found ${urls.length} product URL${urls.length !== 1 ? "s" : ""} to scrape`,
    };
}

// ── Mode label map ─────────────────────────────────────────────────
const MODE_LABELS: Record<string, string> = {
    xml: "Sitemap XML",
    csv: "CSV Product List",
    excel: "Excel Product List",
};

// ════════════════════════════════════════════════════════════════════
// ██  COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function SitemapExtractorPage() {
    const [detectedMode, setDetectedMode] = useState<DetectedMode>(null);
    const [urlsToScrape, setUrlsToScrape] = useState<string[]>([]);
    const [results, setResults] = useState<ExtractedProduct[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [failedCount, setFailedCount] = useState(0);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [statusLabel, setStatusLabel] = useState("");
    /** True when readyProducts were loaded (no scraping needed) */
    const [isReadyData, setIsReadyData] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Reset state ────────────────────────────────────────────────
    const resetState = useCallback(() => {
        setDetectedMode(null);
        setUrlsToScrape([]);
        setResults([]);
        setIsProcessing(false);
        setProgress({ current: 0, total: 0 });
        setFailedCount(0);
        setError("");
        setStatusLabel("");
        setIsReadyData(false);
    }, []);

    // ── Apply parse result ─────────────────────────────────────────
    const applyResult = useCallback((result: ParseResult) => {
        if (!result.mode) {
            setError(
                result.urlsToScrape.length === 0 && result.readyProducts.length === 0
                    ? "No product data or URLs found in this file."
                    : "Invalid file format."
            );
            setDetectedMode(null);
            setUrlsToScrape([]);
            setResults([]);
            setIsReadyData(false);
            setStatusLabel("");
            return;
        }

        setDetectedMode(result.mode);
        setStatusLabel(result.label);
        setError("");

        if (result.readyProducts.length > 0) {
            // Data is complete — show immediately
            setResults(result.readyProducts);
            setUrlsToScrape([]);
            setIsReadyData(true);
        } else {
            setUrlsToScrape(result.urlsToScrape);
            setResults([]);
            setIsReadyData(false);
        }
        setFailedCount(0);
    }, []);

    // ── File upload handler ────────────────────────────────────────
    const handleFileUpload = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setFileName(file.name);
            resetState();

            const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

            // Read as ArrayBuffer so we can inspect first bytes AND
            // selectively parse as text or xlsx
            const reader = new FileReader();
            reader.onload = (ev) => {
                const buffer = ev.target?.result as ArrayBuffer;
                const bytes = new Uint8Array(buffer.slice(0, 500));
                const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trimStart();

                const isXmlContent =
                    head.startsWith("<?xml") ||
                    head.startsWith("<urlset") ||
                    head.startsWith("<sitemapindex") ||
                    head.includes("<loc");

                // 1) XML content (regardless of extension)
                if (isXmlContent) {
                    const fullText = new TextDecoder("utf-8").decode(buffer);
                    const result = parseXMLText(fullText);
                    if (!result.mode) {
                        setError("Invalid sitemap file. No <loc> tags found.");
                        return;
                    }
                    applyResult(result);
                    return;
                }

                // 2) CSV file
                if (ext === "csv") {
                    const fullText = new TextDecoder("utf-8").decode(buffer);
                    const result = parseCSVText(fullText);
                    if (!result.mode) {
                        setError("No product data or URLs found in this CSV file.");
                        return;
                    }
                    applyResult(result);
                    return;
                }

                // 3) Excel file (.xlsx that is NOT XML)
                if (ext === "xlsx" || ext === "xls") {
                    try {
                        const result = parseExcelBuffer(buffer);
                        if (!result.mode) {
                            setError("No product data or URLs found in this Excel file.");
                            return;
                        }
                        applyResult(result);
                    } catch {
                        setError("Failed to parse Excel file. Please check the file format.");
                    }
                    return;
                }

                // Unknown
                setError("Unsupported file format. Please upload an XML sitemap, CSV, or Excel file.");
            };
            reader.readAsArrayBuffer(file);
        },
        [resetState, applyResult]
    );

    // ── Scrape handler ─────────────────────────────────────────────
    const handleExtract = async () => {
        if (urlsToScrape.length === 0) return;
        setIsProcessing(true);
        setResults([]);
        setFailedCount(0);
        setProgress({ current: 0, total: urlsToScrape.length });

        const BATCH_SIZE = 10;
        let allResults: ExtractedProduct[] = [];
        let totalFailed = 0;

        for (let i = 0; i < urlsToScrape.length; i += BATCH_SIZE) {
            const batch = urlsToScrape.slice(i, i + BATCH_SIZE);
            const batchResult = await extractBatch(batch);
            allResults = [...allResults, ...batchResult.results];
            totalFailed += batchResult.failedCount;
            setResults([...allResults]);
            setFailedCount(totalFailed);
            setProgress({ current: Math.min(i + BATCH_SIZE, urlsToScrape.length), total: urlsToScrape.length });
        }

        setIsProcessing(false);
    };

    // ── CSV Download ───────────────────────────────────────────────
    const handleDownloadCSV = () => {
        if (results.length === 0) return;
        const headers = "Name,Link,Image";
        const rows = results.map(
            (r) =>
                `"${(r.name || "").replace(/"/g, '""')}","${r.link}","${r.image}"`
        );
        const csv = "\uFEFF" + [headers, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);
        link.download = `sitemap-products-${date}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    const needsScraping = urlsToScrape.length > 0 && !isReadyData;

    return (
        <div style={{ color: "var(--foreground)" }}>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <FileText className="w-8 h-8" style={{ color: "var(--primary)" }} />
                    Sitemap Product Extractor
                </h1>
                <p style={{ color: "var(--muted)" }}>
                    Upload a sitemap XML, CSV, or Excel file to extract product data for CSV export.
                </p>
            </div>

            {/* Upload Card */}
            <div
                className="rounded-2xl p-6 mb-6"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    Upload Product File
                </h2>

                <div
                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition hover:opacity-80"
                    style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xml,.csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--muted)" }} />
                    <p className="font-medium" style={{ color: "var(--foreground)" }}>
                        {fileName ? fileName : "Click to upload a product file"}
                    </p>
                    <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                        Accepts .xml (sitemap), .csv, .xlsx / .xls (Excel)
                    </p>
                </div>

                {/* Detected mode badge */}
                {detectedMode && (
                    <div className="mt-4 flex items-center gap-2">
                        <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                            style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--accent)" }}
                        >
                            <FileText className="w-3 h-3" />
                            Detected: {MODE_LABELS[detectedMode]}
                        </span>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div
                        className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg"
                        style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                    >
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: "#EF4444" }} />
                        <span className="text-sm font-medium" style={{ color: "#EF4444" }}>
                            {error}
                        </span>
                    </div>
                )}

                {/* Status label + action button */}
                {statusLabel && (
                    <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            {isReadyData ? (
                                <CheckCircle2 className="w-5 h-5" style={{ color: "#22C55E" }} />
                            ) : (
                                <Search className="w-5 h-5" style={{ color: "#22C55E" }} />
                            )}
                            <span className="font-semibold" style={{ color: "#22C55E" }}>
                                {statusLabel}
                            </span>
                        </div>

                        {/* Scraping mode → Extract & Build CSV button */}
                        {needsScraping && (
                            <button
                                onClick={handleExtract}
                                disabled={isProcessing}
                                className="px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition disabled:opacity-50 shadow-lg hover:scale-105"
                                style={{ background: "var(--primary)", color: "#0F172A" }}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" /> Extracting…
                                    </>
                                ) : (
                                    "Extract & Build CSV →"
                                )}
                            </button>
                        )}

                        {/* Ready data mode → Download CSV button */}
                        {isReadyData && results.length > 0 && (
                            <button
                                onClick={handleDownloadCSV}
                                className="px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition shadow-lg hover:scale-105"
                                style={{ background: "var(--accent)", color: "white" }}
                            >
                                <Download className="w-5 h-5" /> Download CSV →
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {isProcessing && (
                <div
                    className="rounded-2xl p-6 mb-6"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                            Processing {progress.current} of {progress.total} products…
                        </span>
                        <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                            {progressPercent}%
                        </span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${progressPercent}%`,
                                background: "linear-gradient(90deg, var(--primary), var(--accent))",
                            }}
                        />
                    </div>
                    {failedCount > 0 && (
                        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#F59E0B" }}>
                            <AlertTriangle className="w-3 h-3" /> {failedCount} URL{failedCount !== 1 ? "s" : ""} failed (skipped)
                        </p>
                    )}
                </div>
            )}

            {/* Results Table */}
            {results.length > 0 && (
                <div
                    className="rounded-2xl p-6 mb-6"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                {isReadyData ? "Product Preview" : "Extracted Products"}
                            </h2>
                            <p className="text-sm" style={{ color: "var(--muted)" }}>
                                {results.length} product{results.length !== 1 ? "s" : ""}
                                {isReadyData ? " loaded" : " extracted"}
                                {failedCount > 0 && (
                                    <span style={{ color: "#F59E0B" }}> · {failedCount} failed</span>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadCSV}
                            className="px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition"
                            style={{ background: "var(--accent)", color: "white" }}
                        >
                            <Download className="w-4 h-4" /> Download CSV
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: "var(--secondary)" }}>
                                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>#</th>
                                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Image</th>
                                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Name</th>
                                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((product, idx) => (
                                    <tr key={idx} className="transition hover:opacity-90" style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-12 h-12 object-cover rounded-lg"
                                                    style={{ border: "1px solid var(--border)" }}
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                                                    <FileText className="w-5 h-5" style={{ color: "var(--muted)" }} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)", maxWidth: "300px" }}>
                                            <span className="line-clamp-2">{product.name || "—"}</span>
                                        </td>
                                        <td className="px-4 py-3" style={{ maxWidth: "300px" }}>
                                            <a
                                                href={product.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 hover:underline text-xs break-all"
                                                style={{ color: "var(--accent)" }}
                                            >
                                                {product.link.replace(/^https?:\/\/(www\.)?/, "").slice(0, 50)}
                                                {product.link.length > 60 ? "…" : ""}
                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!isProcessing && results.length === 0 && urlsToScrape.length === 0 && !error && (
                <div
                    className="rounded-2xl p-12 text-center"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                        style={{ background: "var(--secondary)" }}
                    >
                        <FileText className="w-10 h-10" style={{ color: "var(--muted)" }} />
                    </div>
                    <h3 className="text-xl font-medium mb-2" style={{ color: "var(--foreground)" }}>
                        No file uploaded
                    </h3>
                    <p className="max-w-md mx-auto" style={{ color: "var(--muted)" }}>
                        Upload a product sitemap (.xml), CSV (.csv), or Excel (.xlsx) file to extract product names, links, and images.
                    </p>
                </div>
            )}
        </div>
    );
}
