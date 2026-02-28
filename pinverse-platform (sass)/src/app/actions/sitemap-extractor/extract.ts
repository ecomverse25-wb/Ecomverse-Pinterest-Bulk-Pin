"use server";
// Sitemap Product Extractor - Server Action

export interface ExtractedProduct {
    name: string;
    link: string;
    image: string;
}

export interface ExtractionResult {
    results: ExtractedProduct[];
    failedCount: number;
}

const USER_AGENT = "Mozilla/5.0 (compatible; PinVerse/1.0)";

function extractName(html: string): string {
    // Try og:title first
    const ogMatch = html.match(
        /<meta\s+[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i
    ) ?? html.match(
        /<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:title["']/i
    );
    if (ogMatch?.[1]) return ogMatch[1].trim();

    // Fallback to <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch?.[1]) {
        // Clean common suffixes like " – SiteName" or " | SiteName"
        let title = titleMatch[1].trim();
        title = title.replace(/\s*[–\-|]\s*[^–\-|]+$/, "").trim();
        return title || titleMatch[1].trim();
    }

    return "";
}

function extractImage(html: string): string {
    // Try og:image first
    const ogMatch = html.match(
        /<meta\s+[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']/i
    ) ?? html.match(
        /<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["']/i
    );
    if (ogMatch?.[1]) return ogMatch[1].trim();

    // WooCommerce: first image in .woocommerce-product-gallery
    const wooGalleryMatch = html.match(
        /class\s*=\s*["'][^"']*woocommerce-product-gallery[^"']*["'][^>]*>[\s\S]*?<img[^>]+src\s*=\s*["']([^"']+)["']/i
    );
    if (wooGalleryMatch?.[1]) return wooGalleryMatch[1].trim();

    // Fallback: first img in .product container
    const productMatch = html.match(
        /class\s*=\s*["'][^"']*product[^"']*["'][^>]*>[\s\S]*?<img[^>]+src\s*=\s*["']([^"']+)["']/i
    );
    if (productMatch?.[1]) return productMatch[1].trim();

    // Fallback: first img in <main>
    const mainMatch = html.match(
        /<main[^>]*>[\s\S]*?<img[^>]+src\s*=\s*["']([^"']+)["']/i
    );
    if (mainMatch?.[1]) return mainMatch[1].trim();

    // Last resort: first img on page
    const anyImg = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
    if (anyImg?.[1]) return anyImg[1].trim();

    return "";
}

async function fetchAndExtract(url: string): Promise<ExtractedProduct | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
            headers: { "User-Agent": USER_AGENT },
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) return null;

        const html = await response.text();
        const name = extractName(html);
        const image = extractImage(html);

        return { name: name || url, link: url, image };
    } catch {
        return null;
    }
}

/**
 * Extract product data from a batch of URLs.
 * Call this repeatedly with batches of ~10 URLs from the client.
 */
export async function extractBatch(
    urls: string[]
): Promise<ExtractionResult> {
    const settled = await Promise.allSettled(urls.map(fetchAndExtract));

    const results: ExtractedProduct[] = [];
    let failedCount = 0;

    for (const outcome of settled) {
        if (outcome.status === "fulfilled" && outcome.value) {
            results.push(outcome.value);
        } else {
            failedCount++;
        }
    }

    return { results, failedCount };
}
