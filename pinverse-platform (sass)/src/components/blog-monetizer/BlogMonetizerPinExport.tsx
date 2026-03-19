// v3.2
"use client";

import { useState, useCallback, useEffect } from "react";
import type { BlogArticle, PinData, PinStyleType } from "./BlogMonetizer.types";
import { PIN_STYLE_OPTIONS, ALL_PIN_STYLES } from "./BlogMonetizer.types";
import { generateSinglePinTextAction } from "@/app/actions/blog-monetizer/generate-pin-text";

// ─── Props ───

interface BlogMonetizerPinExportProps {
    articles: BlogArticle[];
    wpBaseUrl: string;
    geminiKey: string;
    geminiModel?: string;
}

// ─── Validation ───

function validatePinDescription(description: string, maxChars: number = 400): string {
    let cleaned = description;
    cleaned = cleaned.replace(/#\w+/g, "").trim();
    cleaned = cleaned.replace(/\*\*/g, "").trim();
    cleaned = cleaned.replace(/\*/g, "").trim();
    cleaned = cleaned.replace(/\b(202[0-9])\b/g, "").trim();
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    cleaned = cleaned.replace(/[,\s]+$/, "").trim();
    if (cleaned.length > maxChars) {
        cleaned = cleaned.substring(0, maxChars);
        const lastSpace = cleaned.lastIndexOf(" ");
        if (lastSpace > maxChars - 30) {
            cleaned = cleaned.substring(0, lastSpace);
        }
        if (!cleaned.endsWith(".") && !cleaned.endsWith("!") && !cleaned.endsWith("?")) {
            cleaned = cleaned + ".";
        }
    }
    return cleaned;
}

function randomPinStyle(): PinStyleType {
    return ALL_PIN_STYLES[Math.floor(Math.random() * ALL_PIN_STYLES.length)];
}

// ─── Canvas Helpers ───

function getAutoFittedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxHeight: number,
    minFontSize: number = 30,
    maxFontSize: number = 110,
    fontFamily: string = "'Arial Black', 'Helvetica Neue', 'Arial', sans-serif"
): { lines: string[], fontSize: number, totalHeight: number } {
    let bestLines: string[] = [];
    let bestSize = minFontSize;
    let bestHeight = 0;

    for (let size = maxFontSize; size >= minFontSize; size -= 2) {
        ctx.font = `900 ${size}px ${fontFamily}`;
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length === 0) break;

        const lines: string[] = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + " " + words[i];
            if (ctx.measureText(testLine).width <= maxWidth) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);

        const lineH = size * 1.35;
        const totalH = lines.length * lineH;

        if (totalH <= maxHeight) {
            bestLines = lines;
            bestSize = size;
            bestHeight = totalH;
            break;
        }

        if (size === minFontSize) {
            bestLines = lines;
            bestSize = size;
            bestHeight = totalH;
        }
    }

    ctx.font = `900 ${bestSize}px ${fontFamily}`;
    return { lines: bestLines, fontSize: bestSize, totalHeight: bestHeight };
}

async function loadImageForCanvas(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => {
            const img2 = new Image();
            img2.onload = () => resolve(img2);
            img2.onerror = reject;
            img2.src = url;
        };
        img.src = url;
    });
}

function drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number, dy: number,
    dw: number, dh: number
) {
    const scale = Math.max(dw / img.width, dh / img.height);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawStickerText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number, y: number,
    fillColor: string = "#FFFFFF",
    strokeColor: string = "rgba(0,0,0,0.85)",
    strokeWidth: number = 18,
    shadowOffsetY: number = 8
) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    // 1. Draw thick outer stroke WITH drop shadow
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = Math.max(10, shadowOffsetY * 2);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadowOffsetY;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(text, x, y);

    // 2. Clear shadow for inner layers
    ctx.shadowColor = "transparent";

    // 3. Draw a subtle bright inner edge for premium glossy feel
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = Math.max(2, strokeWidth * 0.2); // inner glow
    ctx.strokeText(text, x, y);

    // 4. Solid fill on top
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);

    ctx.restore();
}

// ─── Vibrant Gradients for Backgrounds ───
const VIBRANT_GRADIENTS = [
    ["#FF4E50", "#F9D423"], // Sunset
    ["#f12711", "#f5af19"], // Fire
    ["#833ab4", "#fd1d1d", "#fcb045"], // Instagram
    ["#bc4e9c", "#f80759"], // Pink Flavour
    ["#FF416C", "#FF4B2B"], // Bloody Mary
    ["#f857a6", "#ff5858"], // Day Tripper
    ["#e52d27", "#b31217"], // Deep Red
    ["#e65c00", "#F9D423"], // Mango
    ["#1e3c72", "#2a5298"], // Ocean
    ["#11998e", "#38ef7d"], // Fresh Mint
    ["#D31027", "#EA384D"], // Red Salsa
    ["#C33764", "#1D2671"], // Night Space
];

function getBoxGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): CanvasGradient {
    const palette = VIBRANT_GRADIENTS[Math.floor(Math.random() * VIBRANT_GRADIENTS.length)];
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    if (palette.length === 2) {
        gradient.addColorStop(0, palette[0]);
        gradient.addColorStop(1, palette[1]);
    } else {
        gradient.addColorStop(0, palette[0]);
        gradient.addColorStop(0.5, palette[1]);
        gradient.addColorStop(1, palette[2]);
    }
    return gradient;
}

// ─── Decorative border inset ───
function drawDecoInsetBorder(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, inset: number = 16, lineW: number = 4) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
    ctx.restore();
}

// ─── Style-specific Pin Overlay ───

function cleanupPinText(text: string): string {
    let clean = text
        .replace(/\*\*/g, "")
        .replace(/#/g, "")
        .replace(/\b(20\d{2})\b/g, "")
        .replace(/AI Generated/gi, "")
        .trim();

    // Remove ALL emojis — they render as boxes on canvas
    clean = clean.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]|[\u{E000}-\u{F8FF}]/gu, "").trim();

    // Deduplicate consecutive identical words (ignoring punctuation & case)
    const words = clean.split(/\s+/).filter(Boolean);
    const deduped: string[] = [];
    for (let i = 0; i < words.length; i++) {
        const wordClean = words[i].replace(/[.,:;?!-]/g, "").toLowerCase();
        const prevClean = i > 0 ? words[i - 1].replace(/[.,:;?!-]/g, "").toLowerCase() : "";

        if (i === 0 || wordClean !== prevClean) {
            deduped.push(words[i]);
        }
    }

    // Limit to max 7 words for clean canvas text
    const limited = deduped.slice(0, 7).join(" ");
    return limited.toUpperCase();
}

async function applyPinOverlay(
    imageUrl: string,
    title: string,
    style: PinStyleType,
    sectionImages?: string[]
): Promise<string> {
    const W = 1000;
    const H = 1500;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return imageUrl;
    const cleanTitle = cleanupPinText(title);

    try {
        const img = await loadImageForCanvas(imageUrl);

        switch (style) {
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STYLE 1: TOP BANNER — Solid warm banner top 35%
            // Like reference image 1 & 2: massive text in colored banner
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            case "top-banner": {
                drawImageCover(ctx, img, 0, 0, W, H);
                const bannerH = Math.floor(H * 0.35);
                // Vibrant Gradient banner
                ctx.fillStyle = getBoxGradient(ctx, 0, 0, W, bannerH);
                ctx.fillRect(0, 0, W, bannerH);
                // Decorative gold inset border on banner
                ctx.save();
                ctx.strokeStyle = "rgba(255,215,0,0.5)";
                ctx.lineWidth = 3;
                ctx.strokeRect(12, 12, W - 24, bannerH - 24);
                ctx.restore();
                // MASSIVE text
                ctx.textAlign = "center";
                const { lines, fontSize, totalHeight } = getAutoFittedText(ctx, cleanTitle, W - 100, bannerH - 60, 40, 90);
                const lineH = fontSize * 1.35;
                const startY = (bannerH - totalHeight) / 2 + fontSize * 0.9;
                lines.forEach((line, i) => {
                    drawStickerText(ctx, line, W / 2, startY + i * lineH, "#FFFFFF", "rgba(0,0,0,0.7)", fontSize * 0.2, fontSize * 0.15);
                });
                break;
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STYLE 2: BOTTOM FRAME — Decorative scalloped frame bottom 35%
            // Like reference image 3: festive bottom banner with zig-zag edge
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            case "bottom-frame": {
                drawImageCover(ctx, img, 0, 0, W, H);
                const frameH = Math.floor(H * 0.35);
                const frameY = H - frameH;
                // Scalloped/zig-zag top edge
                ctx.fillStyle = getBoxGradient(ctx, 0, frameY - 8, W, frameH + 8);
                ctx.beginPath();
                ctx.moveTo(0, frameY + 30);
                for (let x = 0; x < W; x += 50) {
                    ctx.lineTo(x + 25, frameY - 8);
                    ctx.lineTo(x + 50, frameY + 30);
                }
                ctx.lineTo(W, H);
                ctx.lineTo(0, H);
                ctx.closePath();
                ctx.fill();
                // Inner decorative border
                ctx.save();
                ctx.strokeStyle = "rgba(255,215,0,0.4)";
                ctx.lineWidth = 3;
                ctx.strokeRect(16, frameY + 40, W - 32, frameH - 56);
                ctx.restore();
                // MASSIVE text
                ctx.textAlign = "center";
                const { lines, fontSize, totalHeight } = getAutoFittedText(ctx, cleanTitle, W - 120, frameH - 90, 40, 90);
                const lineH = fontSize * 1.35;
                const startY = frameY + 40 + (frameH - 56 - totalHeight) / 2 + fontSize * 0.9;
                lines.forEach((line, i) => {
                    drawStickerText(ctx, line, W / 2, startY + i * lineH, "#FFFFFF", "rgba(0,0,0,0.6)", fontSize * 0.2, fontSize * 0.15);
                });
                break;
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STYLE 3: CENTER OVERLAY — Semi-transparent overlay mid-center
            // Like a centered label with massive readable text
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            case "center-overlay": {
                drawImageCover(ctx, img, 0, 0, W, H);
                // Large overlay box
                const overlayH = Math.floor(H * 0.42);
                const overlayY = (H - overlayH) / 2;
                const overlayX = 40;
                const overlayW = W - 80;
                // Gradient background under dark wash
                ctx.fillStyle = getBoxGradient(ctx, overlayX, overlayY, overlayW, overlayH);
                ctx.beginPath();
                ctx.roundRect(overlayX, overlayY, overlayW, overlayH, 24);
                ctx.fill();
                ctx.fillStyle = "rgba(0,0,0,0.4)";
                ctx.fill();
                // Decorative inner border
                ctx.strokeStyle = "rgba(255,255,255,0.45)";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.roundRect(overlayX + 14, overlayY + 14, overlayW - 28, overlayH - 28, 16);
                ctx.stroke();
                // MASSIVE text
                ctx.textAlign = "center";
                const { lines, fontSize, totalHeight } = getAutoFittedText(ctx, cleanTitle, overlayW - 80, overlayH - 60, 40, 90);
                const lineH = fontSize * 1.35;
                const startY = overlayY + (overlayH - totalHeight) / 2 + fontSize * 0.9;
                lines.forEach((line, i) => {
                    drawStickerText(ctx, line, W / 2, startY + i * lineH, "#FFFFFF", "rgba(0,0,0,0.5)", fontSize * 0.2, fontSize * 0.15);
                });
                break;
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STYLE 4: CENTER BADGE — Ornate elliptical badge
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            case "center-badge": {
                drawImageCover(ctx, img, 0, 0, W, H);
                const badgeW = 820;
                const badgeH = 440;
                const badgeX = (W - badgeW) / 2;
                const badgeY = (H - badgeH) / 2;
                // Decorative badge with shadow
                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,0.6)";
                ctx.shadowBlur = 20;
                ctx.shadowOffsetY = 8;
                ctx.fillStyle = getBoxGradient(ctx, badgeX, badgeY, badgeW, badgeH);
                ctx.beginPath();
                ctx.ellipse(W / 2, H / 2, badgeW / 2, badgeH / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                // Double decorative border
                ctx.strokeStyle = "rgba(255,215,0,0.5)";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.ellipse(W / 2, H / 2, badgeW / 2 - 16, badgeH / 2 - 16, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = "rgba(255,255,255,0.3)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(W / 2, H / 2, badgeW / 2 - 28, badgeH / 2 - 28, 0, 0, Math.PI * 2);
                ctx.stroke();
                // MASSIVE text
                ctx.textAlign = "center";
                const { lines, fontSize, totalHeight } = getAutoFittedText(ctx, cleanTitle, badgeW - 160, badgeH - 100, 40, 90);
                const lineH = fontSize * 1.35;
                const startY = H / 2 - totalHeight / 2 + fontSize * 0.4;
                lines.forEach((line, i) => {
                    drawStickerText(ctx, line, W / 2, startY + i * lineH, "#FFFFFF", "rgba(0,0,0,0.5)", fontSize * 0.2, fontSize * 0.15);
                });
                break;
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STYLE 5: TOP TITLE + POLAROID COLLAGE
            // Like reference image 1: title banner + scattered food photos
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            case "top-title-collage": {
                const bannerH = Math.floor(H * 0.30);
                // Fill entire background with vibrant gradient
                ctx.fillStyle = getBoxGradient(ctx, 0, 0, W, H);
                ctx.fillRect(0, 0, W, H);
                // Gold inset border on full pin
                drawDecoInsetBorder(ctx, W, H, "rgba(255,215,0,0.45)", 14, 4);
                // MASSIVE title text in banner zone
                ctx.textAlign = "center";
                const { lines, fontSize, totalHeight } = getAutoFittedText(ctx, cleanTitle, W - 100, bannerH - 40, 40, 90);
                const lineH = fontSize * 1.35;
                const startY = (bannerH - totalHeight) / 2 + fontSize * 0.9;
                lines.forEach((line, i) => {
                    drawStickerText(ctx, line, W / 2, startY + i * lineH, "#FFFFFF", "rgba(0,0,0,0.6)", fontSize * 0.2, fontSize * 0.15);
                });
                // Polaroid collage in bottom section
                const collageImages = sectionImages && sectionImages.length > 0 ? sectionImages.slice(0, 4) : [imageUrl];
                const loadedImgs = await Promise.all(collageImages.map(loadImageForCanvas));
                const polaroidW = 400;
                const polaroidH = 460;
                const border = 18;
                const positions = [
                    { x: 60, y: bannerH + 30, rot: -4 },
                    { x: W - polaroidW - 60, y: bannerH + 20, rot: 3 },
                    { x: 100, y: bannerH + polaroidH - 60, rot: 2 },
                    { x: W - polaroidW - 100, y: bannerH + polaroidH - 80, rot: -3 },
                ];
                loadedImgs.forEach((pImg, idx) => {
                    if (idx >= positions.length) return;
                    const pos = positions[idx];
                    ctx.save();
                    ctx.translate(pos.x + polaroidW / 2, pos.y + polaroidH / 2);
                    ctx.rotate((pos.rot * Math.PI) / 180);
                    ctx.shadowColor = "rgba(0,0,0,0.5)";
                    ctx.shadowBlur = 16;
                    ctx.shadowOffsetX = 5;
                    ctx.shadowOffsetY = 5;
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(-polaroidW / 2, -polaroidH / 2, polaroidW, polaroidH);
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    drawImageCover(ctx, pImg, -polaroidW / 2 + border, -polaroidH / 2 + border, polaroidW - border * 2, polaroidH - border * 2 - 50);
                    ctx.restore();
                });
                break;
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STYLE 6: SPLIT STACK — Top photo + title strip + bottom photo
            // Like reference image 5 (blueberry muffins): photo-strip-photo
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            case "split-stack": {
                const topH = Math.floor(H * 0.38);
                const stripH = Math.floor(H * 0.24);
                const bottomH = H - topH - stripH;
                // Top photo
                drawImageCover(ctx, img, 0, 0, W, topH);
                // Bottom photo
                const bottomImg = sectionImages && sectionImages.length > 0
                    ? await loadImageForCanvas(sectionImages[0])
                    : img;
                drawImageCover(ctx, bottomImg, 0, topH + stripH, W, bottomH);
                // Title strip — dark semi-transparent
                ctx.fillStyle = "rgba(30,30,40,0.92)";
                ctx.fillRect(0, topH, W, stripH);
                // Small subtitle line
                ctx.font = "600 30px 'Arial', sans-serif";
                ctx.textAlign = "center";
                ctx.fillStyle = "rgba(255,255,255,0.6)";
                ctx.fillText("— FIND FULL RECIPE —", W / 2, topH + 48);
                // MASSIVE main title
                ctx.textAlign = "center";
                const { lines, fontSize, totalHeight } = getAutoFittedText(ctx, cleanTitle, W - 80, stripH - 80, 40, 90);
                const lineH = fontSize * 1.35;
                const startY = topH + 60 + (stripH - 80 - totalHeight) / 2 + fontSize * 0.9;
                lines.forEach((line, i) => {
                    drawStickerText(ctx, line, W / 2, startY + i * lineH, "#FFFFFF", "rgba(0,0,0,0.7)", fontSize * 0.2, fontSize * 0.15);
                });
                break;
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STYLE 7: RETRO BUBBLE — Sticker text floating on hero photo
            // Like reference image 4 (chocolate cake): thick outline sticker text
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            case "retro-bubble": {
                drawImageCover(ctx, img, 0, 0, W, H);
                // Slight darken vignette for contrast
                const vignetteGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W);
                vignetteGrad.addColorStop(0, "rgba(0,0,0,0)");
                vignetteGrad.addColorStop(1, "rgba(0,0,0,0.35)");
                ctx.fillStyle = vignetteGrad;
                ctx.fillRect(0, 0, W, H);
                // MASSIVE sticker text — floating directly on photo
                // Text positioned in upper 40% of the pin
                ctx.textAlign = "center";
                const { lines, fontSize, totalHeight } = getAutoFittedText(ctx, cleanTitle, W - 100, H * 0.45, 40, 100);
                const lineH = fontSize * 1.35;
                const startY = 120 + fontSize * 0.9;
                // Extra thick stroke for the "sticker peel" effect
                lines.forEach((line, i) => {
                    drawStickerText(ctx, line, W / 2, startY + i * lineH, "#FFF5E6", "rgba(60,30,15,0.92)", fontSize * 0.25, fontSize * 0.15);
                });
                break;
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STYLE 8: TRI-PHOTO STACK — 3 panels + floating badge
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            case "tri-photo-stack": {
                const panelH = Math.floor(H / 3);
                const imgs = [img];
                if (sectionImages && sectionImages.length > 0) {
                    const loaded = await Promise.all(sectionImages.slice(0, 2).map(loadImageForCanvas));
                    imgs.push(...loaded);
                }
                for (let p = 0; p < 3; p++) {
                    const pImg = imgs[p % imgs.length];
                    drawImageCover(ctx, pImg, 0, p * panelH, W, panelH);
                    // Thin divider between panels
                    if (p > 0) {
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillRect(0, p * panelH - 2, W, 4);
                    }
                }
                // Floating badge — larger and more prominent
                const badgeW = 860;
                const badgeH = 280;
                const badgeX = (W - badgeW) / 2;
                const badgeY = (H - badgeH) / 2;
                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,0.6)";
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 8;
                ctx.fillStyle = getBoxGradient(ctx, badgeX, badgeY, badgeW, badgeH);
                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
                ctx.fill();
                ctx.restore();
                // Gold border on badge
                ctx.strokeStyle = "rgba(255,215,0,0.5)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(badgeX + 10, badgeY + 10, badgeW - 20, badgeH - 20, 14);
                ctx.stroke();
                // MASSIVE text in badge
                ctx.textAlign = "center";
                const { lines, fontSize, totalHeight } = getAutoFittedText(ctx, cleanTitle, badgeW - 100, badgeH - 60, 40, 90);
                const lineH = fontSize * 1.35;
                const startY = badgeY + (badgeH - totalHeight) / 2 + fontSize * 0.9;
                lines.forEach((line, i) => {
                    drawStickerText(ctx, line, W / 2, startY + i * lineH, "#FFFFFF", "rgba(0,0,0,0.5)", fontSize * 0.2, fontSize * 0.15);
                });
                break;
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // DEFAULT FALLBACK: Gradient overlay with massive bottom text
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            default: {
                drawImageCover(ctx, img, 0, 0, W, H);
                const grad = ctx.createLinearGradient(0, H * 0.45, 0, H);
                grad.addColorStop(0, "rgba(0,0,0,0)");
                grad.addColorStop(1, "rgba(0,0,0,0.85)");
                ctx.fillStyle = grad;
                ctx.fillRect(0, H * 0.45, W, H * 0.55);
                ctx.textAlign = "center";
                const { lines, fontSize, totalHeight } = getAutoFittedText(ctx, cleanTitle, W - 100, H * 0.45, 40, 100);
                const lineH = fontSize * 1.35;
                const defStartY = H - totalHeight - 40 + fontSize * 0.4;
                lines.forEach((line, i) => {
                    drawStickerText(ctx, line, W / 2, defStartY + i * lineH, "#FFFFFF", "rgba(0,0,0,0.7)", fontSize * 0.2, fontSize * 0.15);
                });
                break;
            }
        }
        return canvas.toDataURL("image/jpeg", 0.92);
    } catch {
        return imageUrl;
    }
}

// ─── Pin Image Prompt Builder ───

export function buildPinStylePrompt(style: PinStyleType, niche: string): string {
    const base = `Ultra high quality photorealistic ${niche} food photography, Pinterest pin, 9:16 vertical portrait, professional studio lighting, sharp focus, vibrant colors, no text or watermarks embedded in the raw photo.`;

    const styleAdditions: Record<PinStyleType, string> = {
        "top-banner": " Flat lay overhead shot of colorful food spread on rustic wooden table, warm ambient lighting, composition leaves top 25% of frame with slightly less detail to allow text overlay placement.",
        "bottom-frame": " Festive colorful overhead scene with decorative cultural props, highly saturated vibrant colors, composition is visually lighter and less busy in the bottom 30% of the frame.",
        "center-overlay": " Overhead flat lay food arrangement, warm earthy tones, centered food composition, soft natural window lighting from the side.",
        "center-badge": " Aerial overhead shot of food spread on rustic wooden or decorative tile surface, vibrant warm color palette with terracotta and earth tones.",
        "top-title-collage": " Generate a clean close-up food hero shot with strong colors and sharp detail. This will be composited into a polaroid collage layout.",
        "split-stack": " Close-up portrait-oriented shot of the hero food item, clean background, sharp focus on food, slightly blurred background. This will be used in a split-panel layout.",
        "retro-bubble": " Close-up beauty hero shot of the main food item centered in frame, moody warm studio lighting, dark or softly blurred background, dramatic food photography style.",
        "tri-photo-stack": " Clean close-up shot of one specific food item or dish from this article, sharp and well-lit. This will be stacked with 2 other similar shots.",
    };

    return base + (styleAdditions[style] || "");
}

// ─── Component ───

export default function BlogMonetizerPinExport({ articles, wpBaseUrl, geminiKey, geminiModel }: BlogMonetizerPinExportProps) {
    const [generatingText, setGeneratingText] = useState(false);
    const [applyingOverlays, setApplyingOverlays] = useState(false);
    const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

    // ─── Build pin data ───
    const buildPins = useCallback((): PinData[] => {
        const newPins: PinData[] = [];
        const FAQ_HEADINGS = [
            "frequently asked questions", "faq", "f.a.q", "common questions",
            "questions and answers", "q&a", "q & a", "people also ask", "questions about",
        ];
        for (const article of articles) {
            if (article.status !== "ready" && article.status !== "published") continue;
            if (article.featuredImageUrl) {
                newPins.push({
                    imageUrl: article.featuredImageUrl,
                    title: article.title.slice(0, 100),
                    description: article.metaDescription || article.title,
                    destinationUrl: article.wpLink || wpBaseUrl || "",
                    sourceArticleKeyword: article.keyword,
                    sectionHeading: article.title,
                    type: "featured",
                    pinTargetKeyword: article.keyword,
                    pinAnnotatedInterests: "",
                    pinTitle: "",
                    pinDescription: "",
                    pinStyle: randomPinStyle(),
                    mainArticleTitle: article.title,
                });
            }
            for (const img of article.sectionImages) {
                const headingLower = img.h2Title.toLowerCase().trim();
                const isFAQ = img.isFAQ || FAQ_HEADINGS.some(f => headingLower.includes(f));
                if (isFAQ || !img.imageUrl) continue;
                newPins.push({
                    imageUrl: img.imageUrl,
                    title: img.h2Title.slice(0, 100),
                    description: `${img.h2Title} - ${article.keyword}`,
                    destinationUrl: article.wpLink || wpBaseUrl || "",
                    sourceArticleKeyword: article.keyword,
                    sectionHeading: img.h2Title,
                    type: "section",
                    pinTargetKeyword: article.keyword,
                    pinAnnotatedInterests: "",
                    pinTitle: "",
                    pinDescription: "",
                    pinStyle: randomPinStyle(),
                    mainArticleTitle: article.title,
                });
            }
        }
        return newPins;
    }, [articles, wpBaseUrl]);

    const [editablePins, setEditablePins] = useState<PinData[]>(buildPins);

    const refreshPins = useCallback(() => {
        setEditablePins(buildPins());
    }, [buildPins]);

    const updatePin = (index: number, field: keyof PinData, value: string) => {
        setEditablePins(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value } as PinData;
            return copy;
        });
    };

    const updatePinStyle = (index: number, style: PinStyleType) => {
        setEditablePins(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], pinStyle: style };
            return copy;
        });
    };

    // ─── Generate Pin Texts — Each Pin Independently ───
    const generateAllPinTexts = async () => {
        if (!geminiKey) { alert("Gemini API key required. Please add it in Setup."); return; }
        setGeneratingText(true);
        setGenerationProgress({ current: 0, total: editablePins.length });

        const updatedPins = [...editablePins];
        const existingTitles: string[] = [];

        for (let i = 0; i < updatedPins.length; i++) {
            setGenerationProgress({ current: i + 1, total: updatedPins.length });
            const pin = updatedPins[i];

            try {
                const result = await generateSinglePinTextAction(
                    pin.sectionHeading,
                    pin.pinTargetKeyword || pin.sourceArticleKeyword,
                    pin.pinAnnotatedInterests,
                    existingTitles,
                    pin.mainArticleTitle,
                    geminiKey,
                    geminiModel || "gemini-2.5-flash",
                );

                if (result.success && result.title && result.description) {
                    updatedPins[i] = {
                        ...pin,
                        pinTitle: result.title.slice(0, 100),
                        pinDescription: validatePinDescription(result.description, 400),
                        pinAnnotatedInterests: pin.pinAnnotatedInterests || result.suggestedInterests || "",
                        title: result.title.slice(0, 100),
                        description: validatePinDescription(result.description, 400),
                    };
                    existingTitles.push(result.title);
                }
            } catch (err) {
                console.error(`[PinExport] Pin ${i} text generation failed:`, err);
            }

            // Small delay between API calls to avoid rate limits
            if (i < updatedPins.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        setEditablePins(updatedPins);
        setGeneratingText(false);
        setGenerationProgress({ current: 0, total: 0 });
    };

    // ─── Apply Overlays to All Pins ───
    const applyAllOverlays = async () => {
        setApplyingOverlays(true);
        // First generate text if not already done
        if (!editablePins.some(p => p.pinTitle)) {
            await generateAllPinTexts();
        }

        // Collect section images for collage/stack styles
        const allSectionImageUrls = editablePins.filter(p => p.type === "section" && p.imageUrl).map(p => p.imageUrl);

        const updatedPins = [...editablePins];
        for (let i = 0; i < updatedPins.length; i++) {
            const pin = updatedPins[i];
            if (!pin.imageUrl) continue;
            try {
                const overlayUrl = await applyPinOverlay(
                    pin.imageUrl,
                    pin.pinTitle || pin.title,
                    pin.pinStyle,
                    allSectionImageUrls.length > 0 ? allSectionImageUrls : undefined,
                );
                updatedPins[i] = { ...pin, overlayImageUrl: overlayUrl };
            } catch {
                // Keep original image
            }
        }
        setEditablePins(updatedPins);
        setApplyingOverlays(false);
    };

    // ─── Regenerate Single Pin Text ───
    const regenerateSingleText = async (idx: number) => {
        if (!geminiKey) return;
        setRegeneratingIdx(idx);

        const pin = editablePins[idx];
        const existingTitles = editablePins
            .filter((_, i) => i !== idx)
            .map(p => p.pinTitle || p.title)
            .filter(Boolean);

        try {
            const result = await generateSinglePinTextAction(
                pin.sectionHeading,
                pin.pinTargetKeyword || pin.sourceArticleKeyword,
                pin.pinAnnotatedInterests,
                existingTitles,
                pin.mainArticleTitle,
                geminiKey,
                geminiModel || "gemini-2.5-flash",
            );

            if (result.success && result.title && result.description) {
                setEditablePins(prev => {
                    const copy = [...prev];
                    copy[idx] = {
                        ...copy[idx],
                        pinTitle: result.title!.slice(0, 100),
                        pinDescription: validatePinDescription(result.description!, 400),
                        pinAnnotatedInterests: copy[idx].pinAnnotatedInterests || result.suggestedInterests || "",
                        title: result.title!.slice(0, 100),
                        description: validatePinDescription(result.description!, 400),
                    };
                    return copy;
                });
            }

            // Also apply overlay
            if (pin.imageUrl) {
                const allSectionImageUrls = editablePins.filter(p => p.type === "section" && p.imageUrl).map(p => p.imageUrl);
                const overlayUrl = await applyPinOverlay(
                    pin.imageUrl,
                    result.success && result.title ? result.title : (pin.pinTitle || pin.title),
                    pin.pinStyle,
                    allSectionImageUrls.length > 0 ? allSectionImageUrls : undefined,
                );
                setEditablePins(prev => {
                    const copy = [...prev];
                    if (copy[idx]) copy[idx] = { ...copy[idx], overlayImageUrl: overlayUrl };
                    return copy;
                });
            }
        } catch { /* keep original */ }
        setRegeneratingIdx(null);
    };

    // ─── Download All as ZIP ───
    const downloadAllAsZip = async () => {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        for (let i = 0; i < editablePins.length; i++) {
            const pin = editablePins[i];
            const imgUrl = pin.overlayImageUrl || pin.imageUrl;
            try {
                if (imgUrl.startsWith("data:")) {
                    const base64 = imgUrl.split(",")[1];
                    zip.file(`pin-${i + 1}-${pin.sourceArticleKeyword.replace(/\s+/g, "-")}.jpg`, base64, { base64: true });
                } else {
                    const response = await fetch(imgUrl);
                    const blob = await response.blob();
                    zip.file(`pin-${i + 1}-${pin.sourceArticleKeyword.replace(/\s+/g, "-")}.jpg`, blob);
                }
            } catch { /* Skip failed */ }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pinterest-pins.zip";
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Download Single as 9:16 ───
    const downloadSingle = (pin: PinData, idx: number) => {
        const imgUrl = pin.overlayImageUrl || pin.imageUrl;
        const link = document.createElement("a");
        link.href = imgUrl;
        link.download = `pin-${idx + 1}-${pin.sourceArticleKeyword.replace(/\s+/g, "-")}.jpg`;
        link.click();
    };

    // ─── Copy All Descriptions ───
    const copyAllDescriptions = () => {
        const text = editablePins.map(p => `${p.pinTitle || p.title}\n${p.pinDescription || p.description}\n${p.destinationUrl}`).join("\n\n---\n\n");
        navigator.clipboard.writeText(text);
    };

    // ─── Export CSV ───
    const exportCSV = () => {
        const headers = ["Title", "Description", "Image URL", "Destination URL", "Type", "Keyword", "Pin Target Keyword", "Pin Annotated Interests", "Pin Title", "Pin Description"];
        const rows = editablePins.map(p => [
            `"${(p.title || "").replace(/"/g, '""')}"`,
            `"${(p.description || "").replace(/"/g, '""')}"`,
            p.overlayImageUrl || p.imageUrl,
            p.destinationUrl,
            p.type,
            p.sourceArticleKeyword,
            `"${(p.pinTargetKeyword || "").replace(/"/g, '""')}"`,
            `"${(p.pinAnnotatedInterests || "").replace(/"/g, '""')}"`,
            `"${(p.pinTitle || "").replace(/"/g, '""')}"`,
            `"${(p.pinDescription || "").replace(/"/g, '""')}"`,
        ].join(","));
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pinterest-pins.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Styles ───
    const inputStyle: React.CSSProperties = {
        width: "100%", background: "#0f1623", border: "1px solid #334155",
        borderRadius: 8, color: "#e2e8f0", padding: "8px 12px", fontSize: 14,
        boxSizing: "border-box",
    };
    const selectStyle: React.CSSProperties = {
        ...inputStyle, cursor: "pointer",
    };
    const goldBtnStyle: React.CSSProperties = {
        background: "#f0c040", color: "#0f1623", border: "none", borderRadius: 8,
        padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14,
    };
    const secondaryBtnStyle: React.CSSProperties = {
        background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
        color: "#e2e8f0", padding: "8px 16px", cursor: "pointer", fontSize: 14,
    };

    // ─── Empty State ───
    if (editablePins.length === 0) {
        return (
            <div style={{
                background: "#1a2035", borderRadius: 12, border: "1px solid #334155", padding: 40, textAlign: "center",
            }}>
                <p style={{ color: "#94a3b8", fontSize: 16 }}>📌 No pins available yet.</p>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Generate articles with images first, then come back here to export Pinterest pins.</p>
                <button onClick={refreshPins} style={{ ...secondaryBtnStyle, marginTop: 16 }}>
                    🔄 Refresh Pins
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* ━━━━━━━━ ACTION BAR ━━━━━━━━ */}
            <div style={{
                display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center",
            }}>
                <span style={{
                    background: "#f0c040", color: "#0f1623", padding: "4px 12px",
                    borderRadius: 20, fontWeight: 700, fontSize: 13,
                }}>
                    📌 {editablePins.length} pins ready
                </span>
                <button
                    onClick={generateAllPinTexts}
                    disabled={generatingText}
                    style={{ ...goldBtnStyle, opacity: generatingText ? 0.6 : 1 }}
                >
                    {generatingText
                        ? `⏳ Generating ${generationProgress.current}/${generationProgress.total}...`
                        : "✨ Generate Pins"}
                </button>
                <button
                    onClick={applyAllOverlays}
                    disabled={applyingOverlays || generatingText}
                    style={{ ...goldBtnStyle, opacity: applyingOverlays || generatingText ? 0.6 : 1 }}
                >
                    {applyingOverlays ? "⏳ Applying Overlays..." : "🎨 Apply Overlays"}
                </button>
                <button onClick={downloadAllAsZip} style={goldBtnStyle}>
                    ⬇️ Download All as ZIP
                </button>
                <button onClick={copyAllDescriptions} style={secondaryBtnStyle}>
                    📋 Copy All Descriptions
                </button>
                <button onClick={exportCSV} style={{ ...secondaryBtnStyle, background: "#065f46", borderColor: "#059669", color: "#d1fae5" }}>
                    📤 Export CSV for Pinterest
                </button>
                <button onClick={refreshPins} style={secondaryBtnStyle}>
                    🔄 Refresh
                </button>
            </div>

            {/* ━━━━━━━━ PIN GRID ━━━━━━━━ */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 20,
            }}>
                {editablePins.map((pin, i) => (
                    <div
                        key={i}
                        style={{
                            background: "#1a2035",
                            borderRadius: 12,
                            border: "1px solid #334155",
                            overflow: "hidden",
                        }}
                    >
                        {/* ── Row 1: Pin Number + Style Selector + Regenerate ── */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                            borderBottom: "1px solid #1e2a3a",
                        }}>
                            <span style={{
                                background: pin.type === "featured" ? "#f0c040" : "#3b82f6",
                                color: "#0f1623", padding: "2px 10px", borderRadius: 6,
                                fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                            }}>
                                #{i + 1} {pin.type === "featured" ? "⭐ Featured" : "📷 Section"}
                            </span>
                            <select
                                value={pin.pinStyle}
                                onChange={e => updatePinStyle(i, e.target.value as PinStyleType)}
                                style={{ ...selectStyle, flex: 1, fontSize: 12, padding: "4px 8px" }}
                            >
                                {PIN_STYLE_OPTIONS.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => regenerateSingleText(i)}
                                disabled={regeneratingIdx === i}
                                style={{
                                    ...secondaryBtnStyle, padding: "4px 10px", fontSize: 11,
                                    opacity: regeneratingIdx === i ? 0.6 : 1, whiteSpace: "nowrap",
                                }}
                            >
                                {regeneratingIdx === i ? "⏳..." : "✨ Regen"}
                            </button>
                        </div>

                        <div style={{ padding: 14 }}>
                            {/* ── Row 2: Target Keyword + Annotated Interests side by side ── */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                                <div>
                                    <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, display: "block", marginBottom: 3 }}>
                                        Target Keyword
                                    </label>
                                    <input
                                        type="text"
                                        value={pin.pinTargetKeyword}
                                        onChange={e => updatePin(i, "pinTargetKeyword", e.target.value)}
                                        placeholder="e.g. Italian recipes"
                                        style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, display: "block", marginBottom: 3 }}>
                                        Annotated Interests
                                    </label>
                                    <input
                                        type="text"
                                        value={pin.pinAnnotatedInterests}
                                        onChange={e => updatePin(i, "pinAnnotatedInterests", e.target.value)}
                                        placeholder="e.g. healthy, meal prep"
                                        style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
                                    />
                                </div>
                            </div>

                            {/* ── Row 3: Pin Title full width ── */}
                            <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, display: "block", marginBottom: 3 }}>
                                Pin Title (max 100)
                            </label>
                            <input
                                type="text"
                                maxLength={100}
                                value={pin.pinTitle}
                                onChange={e => {
                                    updatePin(i, "pinTitle", e.target.value);
                                    updatePin(i, "title", e.target.value);
                                }}
                                placeholder="AI-generated unique title..."
                                style={{ ...inputStyle, fontSize: 13, padding: "6px 10px", marginBottom: 8 }}
                            />

                            {/* ── Row 4: Pin Description full width textarea ── */}
                            <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, display: "block", marginBottom: 3 }}>
                                Pin Description (max 400)
                            </label>
                            <textarea
                                maxLength={400}
                                rows={3}
                                value={pin.pinDescription}
                                onChange={e => {
                                    updatePin(i, "pinDescription", e.target.value);
                                    updatePin(i, "description", e.target.value);
                                }}
                                placeholder="AI-generated unique description..."
                                style={{
                                    ...inputStyle, fontSize: 13, padding: "6px 10px",
                                    resize: "vertical", marginBottom: 4,
                                }}
                            />
                            <div style={{
                                textAlign: "right", fontSize: 10, marginBottom: 10,
                                color: (pin.pinDescription || "").length > 380 ? "#ef4444" : (pin.pinDescription || "").length < 150 && (pin.pinDescription || "").length > 0 ? "#f59e0b" : "#64748b",
                            }}>
                                {(pin.pinDescription || "").length}/400
                            </div>

                            {/* ── Row 5: Destination URL ── */}
                            <div style={{ marginBottom: 8 }}>
                                <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, display: "block", marginBottom: 3 }}>
                                    Destination URL
                                </label>
                                <input
                                    type="text"
                                    value={pin.destinationUrl}
                                    onChange={e => updatePin(i, "destinationUrl", e.target.value)}
                                    style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
                                />
                            </div>

                            {/* ── Row 6: Generated 9:16 Pin Image ── */}
                            <div style={{ position: "relative", marginBottom: 10 }}>
                                <img
                                    src={pin.overlayImageUrl || pin.imageUrl}
                                    alt={pin.pinTitle || pin.title}
                                    style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", display: "block", borderRadius: 10 }}
                                />
                                {pin.overlayImageUrl && (
                                    <span style={{
                                        position: "absolute", top: 8, right: 8,
                                        background: "#10b981", color: "#fff", padding: "2px 6px", borderRadius: 6,
                                        fontSize: 10, fontWeight: 700,
                                    }}>
                                        ✓ Overlay
                                    </span>
                                )}
                            </div>

                            {/* ── Row 7: Regen Text + Download + Pin buttons ── */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button
                                    onClick={() => regenerateSingleText(i)}
                                    disabled={regeneratingIdx === i}
                                    style={{
                                        flex: 1, ...secondaryBtnStyle, padding: "6px 0", textAlign: "center",
                                        fontSize: 12, opacity: regeneratingIdx === i ? 0.6 : 1,
                                    }}
                                >
                                    🖼️ Regen Text
                                </button>
                                <button
                                    onClick={() => downloadSingle(pin, i)}
                                    style={{
                                        flex: 1, ...secondaryBtnStyle, padding: "6px 0", textAlign: "center", fontSize: 12,
                                    }}
                                >
                                    ⬇️ Download
                                </button>
                                <button
                                    onClick={() => {
                                        const prompt = buildPinStylePrompt(pin.pinStyle, pin.pinTargetKeyword || pin.sourceArticleKeyword);
                                        navigator.clipboard.writeText(prompt);
                                        alert("Image prompt copied to clipboard!");
                                    }}
                                    style={{
                                        flex: 1, ...secondaryBtnStyle, padding: "6px 0", textAlign: "center", fontSize: 12,
                                    }}
                                >
                                    📌 Pin
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
