// v3.2
"use server";

import { GoogleGenAI } from "@google/genai";

interface PinTextInput {
    sectionHeading: string;
}

interface PinTextResult {
    pinIndex: number;
    title: string;
    description: string;
    suggestedInterests: string;
}

/**
 * Generate pin texts for ALL pins in a single batch call (used as fallback).
 */
export async function generatePinTextsAction(
    pins: PinTextInput[],
    targetKeyword: string,
    annotatedInterests: string,
    geminiKey: string,
    geminiModel: string = "gemini-2.5-flash",
): Promise<{ success: boolean; results?: PinTextResult[]; error?: string }> {
    if (!geminiKey) return { success: false, error: "Gemini API key is missing." };

    const prompt = `Generate unique Pinterest pin titles and descriptions.
Target keyword: "${targetKeyword}"
Annotated interests: "${annotatedInterests}"

Generate for ${pins.length} pins. Each pin has a topic:
${pins.map((p, i) => `${i + 1}. ${p.sectionHeading}`).join("\n")}

TITLE RULES (max 100 characters):
- Include target keyword naturally as a creative variation
- Unique per pin — specific to the section topic
- Click-worthy and clear
- No hashtags
- No years (2024/2025/2026)
- No ** markdown
- Must NOT be a copy of the section heading — be creative
- Maximum 1 emoji prefix allowed

DESCRIPTION RULES (strict, 150-300 characters):
1. LENGTH: 150-300 characters total. Count carefully.
2. NO HASHTAGS: Zero # symbols anywhere.
3. NO MARKDOWN: No ** bold, no * italic, no formatting. Plain text only.
4. NO YEARS: Never include 2024, 2025, 2026 or any year.
5. TARGET KEYWORD: Include "${targetKeyword}" ONCE naturally.
6. ANNOTATED INTERESTS: Include 2-3 of "${annotatedInterests}" naturally woven in.
7. STRUCTURE: 2-3 natural human-like sentences. No filler phrases.

Also suggest 3-5 comma-separated Pinterest interests related to each pin topic.

Return JSON array ONLY — no explanation, no markdown:
[{"pinIndex":0,"title":"...","description":"...","suggestedInterests":"interest1, interest2, interest3"}]`;

    try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: { parts: [{ text: prompt }] },
        });
        const responseText = response.text?.trim() || "";
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return { success: false, error: "No valid JSON in response." };

        const results: PinTextResult[] = JSON.parse(jsonMatch[0]);
        return { success: true, results };
    } catch (err) {
        console.error("[PinText] Generation error:", err);
        return { success: false, error: err instanceof Error ? err.message : "Pin text generation failed." };
    }
}

/**
 * Remove consecutive duplicate words from text (case-insensitive).
 * e.g. "Italian Sausage Sausage Recipe" → "Italian Sausage Recipe"
 */
function deduplicateWords(text: string): string {
    const words = text.split(/\s+/).filter(Boolean);
    const result: string[] = [];
    for (let i = 0; i < words.length; i++) {
        const wordClean = words[i].replace(/[.,:;?!-]/g, "").toLowerCase();
        const prevClean = i > 0 ? words[i - 1].replace(/[.,:;?!-]/g, "").toLowerCase() : "";
        if (i === 0 || wordClean !== prevClean) {
            result.push(words[i]);
        }
    }
    return result.join(" ");
}

/**
 * Generate a SINGLE pin's title and description independently.
 * Titles: SHORT (max 7 words), keyword-first, no repeated words.
 * Descriptions: keyword-first, 4-5 annotated interests woven in naturally.
 */
export async function generateSinglePinTextAction(
    sectionHeading: string,
    targetKeyword: string,
    annotatedInterests: string,
    existingTitles: string[],
    mainArticleTitle: string,
    geminiKey: string,
    geminiModel: string = "gemini-2.5-flash",
): Promise<{ success: boolean; title?: string; description?: string; suggestedInterests?: string; error?: string }> {
    if (!geminiKey) return { success: false, error: "Gemini API key is missing." };

    const existingTitlesBlock = existingTitles.length > 0
        ? `\nALREADY USED TITLES (you MUST NOT duplicate any of these):\n${existingTitles.map((t, i) => `${i + 1}. "${t}"`).join("\n")}\n`
        : "";

    const prompt = `Generate a UNIQUE Pinterest pin title and description for this topic.

Topic: "${sectionHeading}"
Target keyword: "${targetKeyword}"
Annotated interests: "${annotatedInterests}"
Main Article Title: "${mainArticleTitle}" (DO NOT REPEAT THIS EXACT TITLE)
${existingTitlesBlock}
PIN TITLE RULES (CRITICAL — follow exactly):
1. MAXIMUM 70 CHARACTERS. Short, catchy, click-worthy.
2. MUST include the exact target keyword: "${targetKeyword}" naturally. It does not need to be at the very beginning anymore, but it must be included seamlessly and creatively.
3. NO word repetition.
4. DO NOT repeat the Main Article Title. Create a fresh, related angle.
5. No emojis, hashtags, or years.
6. Must be UNIQUE and DIFFERENT from every title listed above.

PIN DESCRIPTION RULES (strict, 300-400 characters):
1. ANNOTATED INTERESTS: Naturally weave in 4-5 of these interests: "${annotatedInterests}" in context. Do not just list them.
2. LENGTH: 300-400 characters. Give enough detail and context.
3. NO REPEATED KEYWORDS: You CANNOT repeat any primary keyword/interest more than twice in the entire description. Use semantic variations or synonyms if needed.
4. NO padding, no filler phrases like "Click to learn" or "Save this pin" or "Here are the best".
5. NO HASHTAGS, NO MARKDOWN, NO YEARS.
6. Make it conversational but highly informative and solution-oriented.

Also suggest 3-5 comma-separated Pinterest interests.

Return JSON object ONLY — no explanation, no markdown:
{"title":"...","description":"...","suggestedInterests":"interest1, interest2, interest3"}`;

    try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: { parts: [{ text: prompt }] },
        });
        const responseText = response.text?.trim() || "";
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return { success: false, error: "No valid JSON in response." };

        const result = JSON.parse(jsonMatch[0]) as { title: string; description: string; suggestedInterests?: string };

        // Clean up title
        let title = result.title.replace(/\*\*/g, "").replace(/#\w+/g, "").replace(/:/g, "").trim();
        // Remove emojis from title
        title = title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]/gu, "").trim();
        // Deduplicate consecutive words
        title = deduplicateWords(title);
        // Enforce max 7 words
        const titleWords = title.split(/\s+/);
        if (titleWords.length > 7) {
            title = titleWords.slice(0, 7).join(" ");
        }
        title = title.slice(0, 70);

        // Clean up description
        let description = result.description.replace(/\*\*/g, "").replace(/#\w+/g, "").replace(/\*/g, "").trim();
        description = deduplicateWords(description);

        // Enforce 400 char max
        if (description.length > 400) {
            description = description.substring(0, 400);
            const lastSpace = description.lastIndexOf(" ");
            if (lastSpace > 370) description = description.substring(0, lastSpace);
            if (!description.endsWith(".") && !description.endsWith("!") && !description.endsWith("?")) {
                description += ".";
            }
        }

        // Remove years
        title = title.replace(/\b(202[0-9])\b/g, "").replace(/\s+/g, " ").trim();
        description = description.replace(/\b(202[0-9])\b/g, "").replace(/\s+/g, " ").trim();

        return {
            success: true,
            title,
            description,
            suggestedInterests: result.suggestedInterests || annotatedInterests,
        };
    } catch (err) {
        console.error("[PinText] Single generation error:", err);
        return { success: false, error: err instanceof Error ? err.message : "Pin text generation failed." };
    }
}
