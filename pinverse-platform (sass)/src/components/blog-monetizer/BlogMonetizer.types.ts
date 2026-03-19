// v3.2
// ─── Blog Monetizer Types ───

export type Tone = 'conversational' | 'authoritative' | 'storytelling' | 'listicle' | 'how-to';
export type ArticleLength = 'short' | 'standard' | 'long';
export type H2Count = 3 | 5 | 7 | 9 | 11 | 13 | 15;

export type ImageStyle =
    | 'lifestyle'
    | 'flat-lay'
    | 'editorial'
    | 'interior'
    | 'food'
    | 'minimalist'
    | 'warm-cozy'
    | 'custom';

export type ImageDimensions = '1024x1536' | '1536x864' | '1024x1024' | '1200x628';

// ─── Provider Types ───
export type WritingProvider = 'google' | 'claude' | 'openai' | 'replicate';
export type ImageProvider = 'google-imagen' | 'replicate';

// ─── Writing Model Lists ───
export const GEMINI_WRITING_MODELS = [
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro 🆕 Most Advanced' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash ⚡ Frontier Performance' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro ★ Best Stable' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash ⭐ Recommended' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite 💰 Fastest' },
];
export const CLAUDE_WRITING_MODELS = [
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 ★ Most Powerful' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 ⚡ Best Value' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 💰 Fastest' },
];
export const OPENAI_WRITING_MODELS = [
    { value: 'gpt-5.2', label: 'GPT-5.2 ★ Latest Flagship' },
    { value: 'gpt-5.2-instant', label: 'GPT-5.2 Instant ⚡ Fast' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano 💰 Cheapest' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
];
export const REPLICATE_WRITING_MODELS = [
    { value: 'deepseek-ai/deepseek-v3', label: 'DeepSeek V3-0324 ★ Best Open Model' },
    { value: 'google-deepmind/gemini-2.5-flash', label: 'Gemini 2.5 Flash (via Replicate)' },
];

// ─── Image Model Lists ───
export const GOOGLE_IMAGE_MODELS = [
    { value: 'gemini-2.5-flash-image', label: 'Nano Banana ★ Recommended — Fast Creative Workflows' },
    { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2 ⚡ High Volume Fast' },
    { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro 🎨 4K Studio Quality' },
];
export const REPLICATE_IMAGE_MODELS = [
    { value: 'black-forest-labs/flux-2-pro', label: 'Flux 2 Pro ★ Best Quality — ~$0.05' },
    { value: 'black-forest-labs/flux-1.1-pro', label: 'Flux 1.1 Pro ⚡ Fast & Sharp — ~$0.04' },
    { value: 'black-forest-labs/flux-2-max', label: 'Flux 2 Max 🔥 Highest Fidelity — ~$0.06' },
    { value: 'recraft-ai/recraft-v4', label: 'Recraft V4 🎨 Design Taste — $0.04' },
    { value: 'ideogram-ai/ideogram-v3-quality', label: 'Ideogram V3 Quality 📝 Best Text — ~$0.05' },
    { value: 'ideogram-ai/ideogram-v3-balanced', label: 'Ideogram V3 Balanced ⚡ — ~$0.04' },
    { value: 'bytedance/seedream-4.5', label: 'SeeDream 4.5 🎬 Cinematic — $0.04' },
    { value: 'prunaai/z-image-turbo', label: 'Z-Image Turbo 💰 Cheapest — $0.01' },
    { value: 'black-forest-labs/flux-dev', label: 'Flux Dev — ~$0.03' },
    { value: 'black-forest-labs/flux-schnell', label: 'Flux Schnell ⚡ Fastest — ~$0.003' },
    { value: 'lucataco/sdxl-lightning-4step', label: 'SDXL Lightning (4-step) — ~$0.002' },
];

// ─── Provider Defaults ───
export const DEFAULT_WRITING_MODELS: Record<WritingProvider, string> = {
    google: 'gemini-2.5-flash',
    claude: 'claude-sonnet-4-6',
    openai: 'gpt-5.2-instant',
    replicate: 'deepseek-ai/deepseek-v3',
};
export const DEFAULT_IMAGE_MODELS: Record<ImageProvider, string> = {
    'google-imagen': 'gemini-2.5-flash-image',
    replicate: 'black-forest-labs/flux-1.1-pro',
};

// ─── Writing Model Lookup ───
export const WRITING_MODELS_BY_PROVIDER: Record<WritingProvider, { value: string; label: string }[]> = {
    google: GEMINI_WRITING_MODELS,
    claude: CLAUDE_WRITING_MODELS,
    openai: OPENAI_WRITING_MODELS,
    replicate: REPLICATE_WRITING_MODELS,
};
export const IMAGE_MODELS_BY_PROVIDER: Record<ImageProvider, { value: string; label: string }[]> = {
    'google-imagen': GOOGLE_IMAGE_MODELS,
    replicate: REPLICATE_IMAGE_MODELS,
};

export interface AffiliateLink {
    productName: string;
    url: string;
}

export interface ParsedKeyword {
    text: string;
    checked: boolean;
    generatedTitle?: string;
}

export interface FeaturedImageSettings {
    promptTemplate: string;
    style: ImageStyle;
    colorMood: string;
    dimensions: ImageDimensions;
}

export interface BlogMonetizerSettings {
    niche: string;
    tone: Tone;
    articleLength: ArticleLength;
    h2Count: H2Count;
    affiliateLinks: AffiliateLink[];
    featuredImage: FeaturedImageSettings;
}

export interface SectionImage {
    h2Index: number;
    h2Title: string;
    imageUrl: string;
    prompt?: string;
    isFAQ?: boolean;
}

export interface BlogArticle {
    keyword: string;
    title: string;
    content: string; // full HTML
    metaDescription: string;
    wordCount: number;
    featuredImageUrl?: string;
    featuredImagePrompt?: string;
    sectionImages: SectionImage[];
    status: 'pending' | 'generating' | 'ready' | 'error' | 'published';
    errorMessage?: string;
    imageError?: string;
    wpLink?: string;
    wpPostId?: number;
}

export type PinStyleType =
    | 'top-banner'
    | 'bottom-frame'
    | 'center-overlay'
    | 'center-badge'
    | 'top-title-collage'
    | 'split-stack'
    | 'retro-bubble'
    | 'tri-photo-stack';

export const PIN_STYLE_OPTIONS: { value: PinStyleType; label: string }[] = [
    { value: 'top-banner', label: 'Top Banner' },
    { value: 'bottom-frame', label: 'Bottom Frame' },
    { value: 'center-overlay', label: 'Center Overlay' },
    { value: 'center-badge', label: 'Center Badge' },
    { value: 'top-title-collage', label: 'Top Title + Collage' },
    { value: 'split-stack', label: 'Split Stack' },
    { value: 'retro-bubble', label: 'Retro Bubble' },
    { value: 'tri-photo-stack', label: 'Tri-Photo Stack' },
];

export const ALL_PIN_STYLES: PinStyleType[] = PIN_STYLE_OPTIONS.map(o => o.value);

export interface PinData {
    imageUrl: string;
    overlayImageUrl?: string;
    title: string;
    description: string;
    destinationUrl: string;
    sourceArticleKeyword: string;
    sectionHeading: string;
    type: 'featured' | 'section';
    pinTargetKeyword: string;
    pinAnnotatedInterests: string;
    pinTitle: string;
    pinDescription: string;
    pinStyle: PinStyleType;
    mainArticleTitle: string;
}

export interface WPCredentials {
    url: string;
    user: string;
    password: string;
}

export const DEFAULT_IMAGE_PROMPT_TEMPLATE = `You are a professional visual art director for a top lifestyle blog.
Analyze this article and create a stunning featured image prompt.

Article Title: {title}
Article Content Summary: {content}

Generate a detailed image prompt that:
- Captures the OVERALL theme of the entire article, not just one section
- Uses lifestyle photography style: warm, natural, aspirational
- Includes specific scene details: lighting, composition, mood, colors
- Is optimized for WordPress featured image (landscape 1200x628, visually striking)
- Avoids text, logos, faces, or watermarks
- Feels editorial and magazine-quality

Output ONLY the image generation prompt, nothing else.
Make it 2-3 sentences, highly descriptive and specific.`;

export const IMAGE_STYLE_SUFFIXES: Record<ImageStyle, string> = {
    'lifestyle': ', professional lifestyle photography, natural lighting, Canon 5D quality, shallow depth of field',
    'flat-lay': ', overhead flat lay shot, white background, perfectly arranged composition, studio lighting',
    'editorial': ', editorial magazine photography, Elle Decor style, dramatic lighting, high contrast',
    'interior': ', interior design photography, Architectural Digest style, wide angle, perfect symmetry, golden hour light',
    'food': ', food photography, warm tones, rustic wood surface, steam rising, appetizing and inviting',
    'minimalist': ', minimalist photography, clean white background, negative space, single hero element, sharp focus',
    'warm-cozy': ', cozy atmosphere, warm amber tones, bokeh background, hygge aesthetic, soft candlelight',
    'custom': '',
};

export const IMAGE_STYLE_OPTIONS: { value: ImageStyle; label: string }[] = [
    { value: 'lifestyle', label: '📸 Lifestyle Photography' },
    { value: 'flat-lay', label: '🎨 Flat Lay / Overhead Shot' },
    { value: 'editorial', label: '🌿 Editorial / Magazine Style' },
    { value: 'interior', label: '🏠 Interior Design / Decor' },
    { value: 'food', label: '🍳 Food & Kitchen' },
    { value: 'minimalist', label: '✨ Minimalist / Clean' },
    { value: 'warm-cozy', label: '🌅 Warm & Cozy Atmosphere' },
    { value: 'custom', label: '🖼️ Custom (prompt only)' },
];

export const IMAGE_DIMENSION_OPTIONS: { value: ImageDimensions; label: string; ratio: string }[] = [
    { value: '1200x628', label: '🖼️ WordPress Featured 1.91:1', ratio: '1.91:1' },
    { value: '1024x1536', label: '📌 Pinterest Portrait 2:3', ratio: '2:3' },
    { value: '1536x864', label: '🖥️ Blog Header 16:9', ratio: '16:9' },
    { value: '1024x1024', label: '⬜ Square 1:1', ratio: '1:1' },
];

export const TONE_OPTIONS: { value: Tone; label: string }[] = [
    { value: 'conversational', label: 'Conversational' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'storytelling', label: 'Storytelling' },
    { value: 'listicle', label: 'Listicle' },
    { value: 'how-to', label: 'How-To Guide' },
];

export const ARTICLE_LENGTH_OPTIONS: { value: ArticleLength; label: string; words: string }[] = [
    { value: 'short', label: 'Short', words: '~800 words' },
    { value: 'standard', label: 'Standard', words: '~1500 words' },
    { value: 'long', label: 'Long', words: '~2500 words' },
];

export const H2_COUNT_OPTIONS: H2Count[] = [3, 5, 7, 9, 11, 13, 15];

export const DEFAULT_SETTINGS: BlogMonetizerSettings = {
    niche: '',
    tone: 'conversational',
    articleLength: 'standard',
    h2Count: 5,
    affiliateLinks: [],
    featuredImage: {
        promptTemplate: DEFAULT_IMAGE_PROMPT_TEMPLATE,
        style: 'lifestyle',
        colorMood: '',
        dimensions: '1200x628',
    },
};
