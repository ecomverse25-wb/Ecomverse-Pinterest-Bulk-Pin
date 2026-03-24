import type { ProductCatalogItem } from "../types";

/**
 * Parses a plain text list of products into an array of ProductCatalogItem objects.
 * Expected format per line: Product Name: URL
 * Alternatively just URL, or Product Name - URL.
 */
export function parseProductFile(text: string): ProductCatalogItem[] {
  if (!text) return [];

  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const catalog: ProductCatalogItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to extract URL
    const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1] : "";

    if (!url) continue; // Skip lines without a valid URL

    // Try to extract product name by removing the URL and common separators
    let name = trimmed.replace(url, "").trim();
    name = name.replace(/^[-:]\s*|\s*[-:]$/g, "").trim();

    // If no name found but we have a URL, use the domain or ending path as a fallback name
    if (!name) {
      try {
        const u = new URL(url);
        name = u.hostname.replace("www.", "") + u.pathname;
        if (name.length > 50) name = name.substring(0, 47) + "...";
      } catch {
        name = "Product Link";
      }
    }

    catalog.push({
      productName: name,
      url: url,
    });
  }

  return catalog;
}
