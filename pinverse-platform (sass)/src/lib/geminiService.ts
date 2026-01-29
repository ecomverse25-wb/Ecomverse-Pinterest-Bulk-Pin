import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedTextResponse, PinConfig } from "./types";

// Helper to poll Replicate status
const pollReplicate = async (getUrl: string, apiKey: string): Promise<string> => {
    while (true) {
        const response = await fetch(getUrl, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Replicate polling error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status === 'succeeded') {
            return data.output[0] || data.output;
        } else if (data.status === 'failed' || data.status === 'canceled') {
            throw new Error(`Replicate generation failed: ${data.error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
    }
};

const generateReplicateImage = async (prompt: string, config: PinConfig, apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("Replicate API Key is missing. Please add it in Settings.");

    let modelVersion = "";
    const inputs: Record<string, unknown> = { prompt };

    switch (config.model) {
        case 'flux-schnell':
            modelVersion = "black-forest-labs/flux-schnell";
            inputs.aspect_ratio = config.ratio === '9:16' ? '9:16' : (config.ratio === '2:3' ? '2:3' : '9:16');
            break;
        case 'flux-dev':
            modelVersion = "black-forest-labs/flux-dev";
            inputs.aspect_ratio = config.ratio === '9:16' ? '9:16' : (config.ratio === '2:3' ? '2:3' : '9:16');
            break;
        case 'sdxl-turbo':
            modelVersion = "stability-ai/sdxl-turbo";
            if (config.ratio === '9:16') { inputs.width = 576; inputs.height = 1024; }
            else if (config.ratio === '2:3') { inputs.width = 672; inputs.height = 1008; }
            else if (config.ratio === '1:2') { inputs.width = 512; inputs.height = 1024; }
            else { inputs.width = 768; inputs.height = 768; }
            inputs.guidance_scale = 0.0;
            inputs.num_inference_steps = 2;
            break;
        case 'ideogram':
            modelVersion = "ideogram-ai/ideogram-v2";
            inputs.aspect_ratio = config.ratio === '1:2' ? '9:16' : config.ratio;
            break;
        case 'seedream4':
            modelVersion = "black-forest-labs/flux-dev";
            inputs.aspect_ratio = config.ratio === '9:16' ? '9:16' : '2:3';
            inputs.prompt = `SeeDream4 Style, ${prompt}`;
            break;
        case 'pruna':
            modelVersion = "stability-ai/sdxl-turbo"; // Using SDXL Turbo as the efficient/cheap option
            inputs.width = 576; inputs.height = 1024;
            inputs.guidance_scale = 0.0;
            inputs.num_inference_steps = 2;
            break;
        default:
            modelVersion = "black-forest-labs/flux-schnell";
    }

    const response = await fetch("https://api.replicate.com/v1/models/" + modelVersion + "/predictions", {
        method: "POST",
        headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputs })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Replicate API Error: ${err.detail || response.statusText}`);
    }

    const prediction = await response.json();
    return await pollReplicate(prediction.urls.get, apiKey);
};

// Analyze the URL to generate prompts and SEO data
export const generatePinDetails = async (
    url: string,
    config: PinConfig,
    textRules: string = '',
    imageRules: string = '',
    interests: string = '',
    targetKeyword: string = '',
    googleApiKey: string
): Promise<GeneratedTextResponse> => {
    if (!googleApiKey) throw new Error("Google API Key is missing. Please check your settings.");

    const ai = new GoogleGenAI({ apiKey: googleApiKey });

    try {
        let styleInstruction = "";
        switch (config.style) {
            case 'basic_top': styleInstruction = "The image should have clear space at the TOP for text, or include the title text at the top in a modern font."; break;
            case 'basic_middle': styleInstruction = "The image should have the title text overlaying the center/middle of the image in a bold, readable font."; break;
            case 'basic_bottom': styleInstruction = "The image should have clear space at the BOTTOM for text, or include the title text at the bottom."; break;
            case 'collage': styleInstruction = "The image should appear as a collage of 2-3 related images."; break;
            case 'custom': styleInstruction = "Follow the brand guidelines for image style."; break;
        }

        if (config.websiteUrl) {
            styleInstruction += ` IMPORTANT: You MUST include the website URL "${config.websiteUrl}" as small, readable text at the bottom center of the image.`;
        }

        const productModeInstruction = config.contentType === 'product'
            ? `
      CRITICAL PRODUCT VISUALIZATION INSTRUCTIONS:
      1. IDENTIFY the specific physical product being sold or discussed at the URL.
      2. The 'visualPrompt' MUST describe a photorealistic, high-end product photography shot of this specific item.
      3. SETTING: Place the product in a completely natural, real-life environment where it is typically used.
      4. ANGLES: Use dynamic, eye-catching camera angles. Avoid boring front-on shots.
      5. LIGHTING: Use natural, cinematic lighting (golden hour, dappled light, or soft window light).
      6. Do NOT create generic abstract images. Show the PRODUCT prominently.
      `
            : '';

        const keywordContext = targetKeyword ? `Target SEO Keyword: "${targetKeyword}"` : 'Identify the most effective SEO Target Keyword for this content.';
        const promptContext = interests ? `Additional Focus Interests/Keywords: ${interests}` : '';

        const processedTextRules = textRules
            .replace(/\$\{url\}/g, url)
            .replace(/\$\{interestsNote\}/g, interests ? ` Note on interests: ${interests}` : '');

        const systemInstruction = `You are an expert Pinterest content strategist using advanced NLP techniques for high-conversion copy.
    
    TEXT PROMPT RULES (Titles/Descriptions):
    ${processedTextRules}

    IMAGE PROMPT RULES (Visuals):
    ${imageRules}
    
    TEXT HANDLING GUARDRAILS:
    - You are free to be creative with the visual style (vibrant, poster-style, etc.) as requested.
    - HOWEVER, when describing text overlays in the 'visualPrompt', you MUST strictly instruct the image generator to:
      1. Write the title text EXACTLY ONCE.
      2. Ensure there are NO repeated words.
      3. Do NOT fill the background with random text or "word clouds".
      4. If the design is busy, use a solid backing shape behind the single title text to ensure legibility.
    
    ${productModeInstruction}
    
    If reference images are provided, use them to accurately describe the product's color, shape, and features in the 'visualPrompt', but ALWAYS place it in a new, creative scene as described above.`;

        const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

        if (config.referenceImages && config.referenceImages.length > 0) {
            config.referenceImages.forEach(imgData => {
                try {
                    const base64Data = imgData.split(',')[1];
                    const mimeMatch = imgData.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                    contents.push({ inlineData: { mimeType, data: base64Data } });
                } catch (e) {
                    console.warn("Failed to parse reference image for Gemini", e);
                }
            });
        }

        contents.push({
            text: `Analyze this URL string and predict the content to create a high-converting Pinterest Pin configuration. 
      URL: ${url}
      ${promptContext}
      ${keywordContext}
      
      Configuration:
      - Aspect Ratio: ${config.ratio}
      - Style Goal: ${styleInstruction}

      I need:
      1. A Target Keyword (If provided, use it. If not, extract the best one).
      2. A visual image prompt for the generative AI following the IMAGE PROMPT RULES and TEXT HANDLING GUARDRAILS. 
         ${['ideogram', 'flux-schnell', 'flux-dev', 'sdxl-turbo', 'seedream4'].includes(config.model) ? 'Optimize prompt for Replicate/Flux/SDXL models (detailed, descriptive).' : 'Optimize for Gemini/Imagen.'}
         IMPORTANT: In the generated Visual Prompt, if the rules ask to include text (e.g. {title}), replace {title} with the actual "title" you generated.
      3. A catchy title following TEXT PROMPT RULES.
      4. A SEO-optimized description following TEXT PROMPT RULES.
      5. 3-5 relevant hashtags.
      `
        });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contents },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        targetKeyword: { type: Type.STRING, description: "The main SEO keyword targeted." },
                        visualPrompt: { type: Type.STRING, description: "Detailed prompt for image generation." },
                        title: { type: Type.STRING, description: "Catchy headline for the pin." },
                        description: { type: Type.STRING, description: "Engaging description for the pin." },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["targetKeyword", "visualPrompt", "title", "description", "tags"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as GeneratedTextResponse;
        }
        throw new Error("No response from Gemini");
    } catch (error) {
        console.error("Error generating pin details:", error);
        throw error;
    }
};

// Regenerate ONLY text based on new keywords
export const regeneratePinText = async (
    url: string,
    targetKeyword: string,
    interests: string,
    textRules: string,
    imageRules: string,
    googleApiKey: string
): Promise<GeneratedTextResponse> => {
    if (!googleApiKey) throw new Error("Google API Key is missing. Please check your settings.");
    const ai = new GoogleGenAI({ apiKey: googleApiKey });

    const processedTextRules = textRules
        .replace(/\$\{url\}/g, url)
        .replace(/\$\{interestsNote\}/g, interests ? ` Note on interests: ${interests}` : '');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Regenerate Pinterest text content for this URL: ${url}
            
            IMPORTANT: The user has explicitly changed the target keyword.
            NEW TARGET KEYWORD: "${targetKeyword}"
            Annotated Interests: "${interests}"

            Instruction:
            1. IGNORE any previous keyword context if it conflicts with the NEW TARGET KEYWORD.
            2. Rewrite the Title, Description, and Visual Prompt to focus 100% on "${targetKeyword}".

            Follow these rules:
            TEXT RULES:
            ${processedTextRules}

            IMAGE RULES:
            ${imageRules}
            
            CRITICAL VISUAL PROMPT RULE: 
            - Ensure the visual prompt reflects the NEW keyword.
            - STRICTLY FORBID repeating words or random text stickers. 
            - Title text must appear ONCE.

            IMPORTANT: In the 'visualPrompt', if the IMAGE RULES ask to include text (e.g. {title}), replace {title} with the actual new "title" you generated.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        targetKeyword: { type: Type.STRING },
                        visualPrompt: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "description", "tags"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as GeneratedTextResponse;
        }
        throw new Error("No response from Gemini");
    } catch (error) {
        console.error("Error regenerating text:", error);
        throw error;
    }
};

// Apply overlays (Logo and CTA) to a base image using HTML Canvas
const applyOverlays = async (baseImageUrl: string, config: PinConfig): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject("Canvas context not supported");
            return;
        }

        const baseImg = new Image();
        baseImg.crossOrigin = "anonymous";

        baseImg.onload = () => {
            canvas.width = baseImg.width;
            canvas.height = baseImg.height;
            ctx.drawImage(baseImg, 0, 0);

            // Draw CTA Button
            if (config.ctaText) {
                const text = config.ctaText;
                const bgColor = config.ctaColor || '#E60023';
                const textColor = config.ctaTextColor || '#FFFFFF';
                const position = config.ctaPosition || 'bottom-center';

                const fontSize = canvas.width * 0.045;
                ctx.font = `bold ${fontSize}px sans-serif`;
                const metrics = ctx.measureText(text);

                const hPadding = fontSize * 1.5;
                const vPadding = fontSize * 0.8;
                const btnWidth = metrics.width + (hPadding * 2);
                const btnHeight = fontSize + (vPadding * 2);

                const margin = canvas.width * 0.05;
                let x = 0;
                let y = 0;

                if (position === 'bottom-right') {
                    x = canvas.width - btnWidth - margin;
                    y = canvas.height - btnHeight - margin;
                } else if (position === 'bottom-left') {
                    x = margin;
                    y = canvas.height - btnHeight - margin;
                } else if (position === 'top-right') {
                    x = canvas.width - btnWidth - margin;
                    y = margin;
                } else if (position === 'top-left') {
                    x = margin;
                    y = margin;
                } else if (position === 'center') {
                    x = (canvas.width - btnWidth) / 2;
                    y = (canvas.height - btnHeight) / 2;
                } else {
                    x = (canvas.width - btnWidth) / 2;
                    y = canvas.height - btnHeight - margin;
                }

                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.fillStyle = bgColor;
                ctx.beginPath();
                const r = btnHeight / 2;
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + btnWidth - r, y);
                ctx.quadraticCurveTo(x + btnWidth, y, x + btnWidth, y + r);
                ctx.quadraticCurveTo(x + btnWidth, y + btnHeight, x + btnWidth - r, y + btnHeight);
                ctx.lineTo(x + r, y + btnHeight);
                ctx.quadraticCurveTo(x, y + btnHeight, x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
                ctx.fill();

                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, x + (btnWidth / 2), y + (btnHeight / 2) + (fontSize * 0.05));
            }

            // Draw Logo
            if (config.logoData) {
                const logoImg = new Image();
                logoImg.onload = () => {
                    const sizePercent = config.logoSize || 20;
                    const position = config.logoPosition || 'bottom-right';

                    const logoWidth = canvas.width * (sizePercent / 100);
                    const logoHeight = logoWidth * (logoImg.height / logoImg.width);

                    const paddingX = canvas.width * 0.05;
                    const paddingY = canvas.height * 0.05;

                    let x = 0;
                    let y = 0;

                    if (position === 'top-left') {
                        x = paddingX; y = paddingY;
                    } else if (position === 'top-right') {
                        x = canvas.width - logoWidth - paddingX; y = paddingY;
                    } else if (position === 'bottom-left') {
                        x = paddingX; y = canvas.height - logoHeight - paddingY;
                    } else if (position === 'bottom-right') {
                        x = canvas.width - logoWidth - paddingX; y = canvas.height - logoHeight - paddingY;
                    } else if (position === 'center') {
                        x = (canvas.width - logoWidth) / 2; y = (canvas.height - logoHeight) / 2;
                    } else if (position === 'top-center') {
                        x = (canvas.width - logoWidth) / 2; y = paddingY;
                    } else if (position === 'bottom-center') {
                        x = (canvas.width - logoWidth) / 2; y = canvas.height - logoHeight - paddingY;
                    }

                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 5;
                    ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);

                    resolve(canvas.toDataURL('image/png'));
                };
                logoImg.onerror = () => {
                    console.warn("Logo failed to load");
                    resolve(canvas.toDataURL('image/png'));
                };
                logoImg.src = config.logoData;
            } else {
                resolve(canvas.toDataURL('image/png'));
            }
        };

        baseImg.onerror = async () => {
            try {
                const response = await fetch(baseImageUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    const localUrl = reader.result as string;
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        canvas.width = fallbackImg.width;
                        canvas.height = fallbackImg.height;
                        ctx.drawImage(fallbackImg, 0, 0);
                        resolve(localUrl);
                    };
                    fallbackImg.src = localUrl;
                };
                reader.readAsDataURL(blob);
            } catch {
                reject("Failed to load base image (CORS)");
            }
        };

        baseImg.src = baseImageUrl;
    });
};

// Generate the actual image based on the prompt
export const generatePinImage = async (
    prompt: string,
    config: PinConfig,
    googleApiKey: string,
    replicateApiKey?: string
): Promise<string> => {
    let generatedImageUrl = "";

    if (['ideogram', 'flux-schnell', 'flux-dev', 'sdxl-turbo', 'seedream4'].includes(config.model)) {
        if (!replicateApiKey) throw new Error("Please add your Replicate API Token in Settings.");
        generatedImageUrl = await generateReplicateImage(prompt, config, replicateApiKey);
    } else {
        if (!googleApiKey) throw new Error("Google API Key is missing. Please check your settings.");
        const ai = new GoogleGenAI({ apiKey: googleApiKey });

        try {
            let targetRatio = "9:16";
            if (config.ratio === '2:3') targetRatio = '3:4';

            if (config.model === 'gemini-2.5-flash-image' || config.model === 'gemini-3-pro-image-preview') {
                const requestConfig: Record<string, unknown> = {
                    imageConfig: {
                        aspectRatio: targetRatio,
                        numberOfImages: 1,
                    }
                };
                if (config.model === 'gemini-3-pro-image-preview') {
                    (requestConfig.imageConfig as Record<string, unknown>).imageSize = config.imageSize || "1K";
                }

                const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
                if (config.referenceImages && config.referenceImages.length > 0) {
                    config.referenceImages.forEach(imgData => {
                        try {
                            const base64Data = imgData.split(',')[1];
                            const mimeMatch = imgData.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
                            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                            contents.push({ inlineData: { mimeType, data: base64Data } });
                        } catch (e) {
                            console.warn("Ref image error", e);
                        }
                    });
                }
                contents.push({ text: prompt });

                const response = await ai.models.generateContent({
                    model: config.model,
                    contents: { parts: contents },
                    config: requestConfig
                });

                let foundImage = false;
                for (const part of response.candidates?.[0]?.content?.parts || []) {
                    if ('inlineData' in part && part.inlineData) {
                        generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
                        foundImage = true;
                        break;
                    }
                }
                if (!foundImage) throw new Error("No image data received from Gemini");

            } else if (config.model === 'imagen-4.0-generate-001') {
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt,
                    config: { numberOfImages: 1, aspectRatio: config.ratio, outputMimeType: 'image/jpeg' },
                });
                if (response.generatedImages?.[0]?.image?.imageBytes) {
                    generatedImageUrl = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
                } else {
                    throw new Error("No image data received from Imagen");
                }
            }
        } catch (error) {
            console.error("Error generating image:", error);
            throw error;
        }
    }

    if ((config.logoData || config.ctaText) && generatedImageUrl) {
        try {
            return await applyOverlays(generatedImageUrl, config);
        } catch (e) {
            console.warn("Failed to apply overlays:", e);
            return generatedImageUrl;
        }
    }

    return generatedImageUrl;
};

// Edit an existing image using Gemini
export const editPinImage = async (
    base64Image: string,
    prompt: string,
    googleApiKey: string
): Promise<string> => {
    if (!googleApiKey) throw new Error("Google API Key is missing. Please check your settings.");
    const ai = new GoogleGenAI({ apiKey: googleApiKey });

    try {
        const base64Data = base64Image.split(',')[1];
        const mimeMatch = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: prompt }
                ]
            },
            config: { imageConfig: { aspectRatio: "9:16" } }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if ('inlineData' in part && part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image data returned from edit");
    } catch (error) {
        console.error("Error editing image:", error);
        throw error;
    }
};

// Chat with Gemini
export const chatWithGemini = async (
    message: string,
    history: Array<{ role: string; text: string }> = [],
    googleApiKey: string
): Promise<string> => {
    if (!googleApiKey) return "Please enter your Google API Key in settings to chat.";

    const ai = new GoogleGenAI({ apiKey: googleApiKey });
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history.map(h => ({
            role: h.role as 'user' | 'model',
            parts: [{ text: h.text }]
        }))
    });
    const result = await chat.sendMessage({ message });
    return result.text || "I didn't get that.";
};
