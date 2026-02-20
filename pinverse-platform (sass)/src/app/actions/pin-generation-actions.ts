"use server";

import sharp from "sharp";
import { createClient } from "@/lib/supabase-server";

interface PinGenerationInput {
    imageUrl: string;
    articleTitle: string;
    articleTopic: string;
}

interface PinGenerationResult {
    success: boolean;
    imageBase64?: string;
    imageName?: string;
    error?: string;
}

/**
 * Generate a Pinterest-style pin image using server-side image processing
 * Now includes Text Overlay for professional look.
 */
export async function generatePinImageAction(
    input: PinGenerationInput
): Promise<PinGenerationResult> {
    try {
        const { imageUrl, articleTitle, articleTopic } = input;

        if (!imageUrl) {
            return { success: false, error: "Image URL is required" };
        }

        // 1. Fetch the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // 2. Get image metadata
        const metadata = await sharp(imageBuffer).metadata();
        const { width = 1000, height = 1500 } = metadata;

        // 3. Create blurred background (The 'Natural' Look)
        const blurredBackground = await sharp(imageBuffer)
            .resize(1000, 1500, { fit: "cover" })
            .blur(30)
            .modulate({ brightness: 0.7 }) // Darken slightly for contrast
            .toBuffer();

        // 4. Resize main image
        const targetWidth = 900;
        const scale = targetWidth / (width || 1000);
        const targetHeight = Math.floor((height || 1500) * scale);
        // Cap height to ensure room for text
        const maxMainHeight = 1100;

        const mainImage = await sharp(imageBuffer)
            .resize(targetWidth, Math.min(targetHeight, maxMainHeight), { fit: "inside" })
            .toBuffer();

        // 5. Generate Text Overlay SVG
        // Simple word wrap logic
        const words = articleTitle.split(" ");
        let line = "";
        let lines = [];
        const maxChars = 20; // Approx for font size

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + " ";
            if (testLine.length > maxChars) {
                lines.push(line);
                line = words[i] + " ";
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // SVG Content
        const lineHeight = 60;
        const fontSize = 48;
        const textHeight = lines.length * lineHeight;
        const svgHeight = textHeight + 100;

        const svgText = `
        <svg width="1000" height="1500">
            <style>
                .title { fill: white; font-family: sans-serif; font-weight: bold; font-size: ${fontSize}px; text-anchor: middle; }
                .subtitle { fill: #fbbf24; font-family: sans-serif; font-weight: normal; font-size: 32px; text-anchor: middle; }
                .bg { fill: rgba(0,0,0,0.6); }
            </style>
            <!-- Bottom Gradient or Box -->
            <rect x="50" y="${1250 - textHeight}" width="900" height="${textHeight + 100}" rx="20" class="bg" />
            
            ${lines.map((l, i) => `<text x="500" y="${1300 - textHeight + (i * lineHeight)}" class="title">${l.trim()}</text>`).join('')}
            
            <text x="500" y="${1350}" class="subtitle">Read more on site</text>
        </svg>
        `;

        const textOverlay = Buffer.from(svgText);

        // 6. Composite everything
        const x = Math.floor((1000 - targetWidth) / 2); // Center X
        const y = 100; // Fixed Top Offset for Main Image

        const compositeImage = await sharp(blurredBackground)
            .composite([
                {
                    input: mainImage,
                    top: y,
                    left: x,
                },
                {
                    input: textOverlay,
                    top: 0,
                    left: 0,
                }
            ])
            .jpeg({ quality: 90 })
            .toBuffer();

        // 7. Return Base64
        const base64Image = `data:image/jpeg;base64,${compositeImage.toString("base64")}`;
        const imageName = `pin-${articleTopic.replace(/\s+/g, "-").toLowerCase()}.jpg`;

        // Track usage (fire and forget)
        (async () => {
            try {
                const supabase = await createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { trackUserAction } = await import("./tracking-actions");
                    await trackUserAction(user.id, 'pin_created', `Created pin for: ${articleTitle}`, { topic: articleTopic });
                }
            } catch (err) {
                console.error("Tracking failed inside pin action:", err);
            }
        })();

        return {
            success: true,
            imageBase64: base64Image,
            imageName,
        };
    } catch (error: unknown) {
        console.error("Pin generation error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: msg };
    }
}

/**
 * Batch generate multiple pins in parallel
 */
export async function generateBulkPinsAction(
    inputs: PinGenerationInput[]
): Promise<PinGenerationResult[]> {
    try {
        const results = await Promise.all(
            inputs.map((input) => generatePinImageAction(input))
        );
        return results;
    } catch (error: unknown) {
        console.error("Bulk generation error:", error);
        return inputs.map(() => ({
            success: false,
            error: "Batch processing failed",
        }));
    }
}
