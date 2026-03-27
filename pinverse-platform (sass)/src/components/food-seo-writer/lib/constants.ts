// ─── Food SEO Writer v2.0 — Constants & Thresholds ───

import type {
  ContentType,
  WordCountTarget,
  WritingPersona,
  Tone,
  PinStyle,
  PinVariantCount,
  SeasonalOverride,
  LinkAttribute,
  FormInputs,
  ImageStyle,
  ImageDimensions,
  ImageProvider,
  ArticleTone,
  ContentStrategy,
  H2SectionCount,
  SchemaTypeOverride,
  TitleFormula,
  AuthoritySource,
  ContentProvider,
} from "../types";

// ─── Content Type Options (Section 2.2) ───

export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "auto-detect", label: "Auto-detect (AI selects based on keyword intent)" },
  { value: "Single Recipe Post", label: "Single Recipe Post" },
  { value: "Recipe Roundup/Listicle", label: "Recipe Roundup/Listicle" },
  { value: "Meal Prep Guide", label: "Meal Prep Guide" },
  { value: "Product Review", label: "Product Review" },
  { value: "Comparison Post", label: "Comparison Post" },
  { value: "Holiday/Seasonal", label: "Holiday/Seasonal" },
  { value: "Pillar Page", label: "Pillar Page" },
];

// ─── Word Count Targets (Section 2.2) ───

export const WORD_COUNT_OPTIONS: WordCountTarget[] = [
  "Short (800-1200)",
  "Medium (1500-2500)",
  "Long (3000-4500)",
];

export const WORD_COUNT_RANGES: Record<WordCountTarget, { min: number; max: number }> = {
  "Short (800-1200)": { min: 800, max: 1200 },
  "Medium (1500-2500)": { min: 1500, max: 2500 },
  "Long (3000-4500)": { min: 3000, max: 4500 },
};

// ─── Writing Persona Options (Section 2.2 Group 5) ───

export const WRITING_PERSONA_OPTIONS: WritingPersona[] = [
  "Professional Food Blogger",
  "Home Cook Mom",
  "Health & Wellness Expert",
  "Chef",
  "Custom",
];

// ─── Tone Options (Section 2.2 Group 5) ───

export const TONE_OPTIONS: Tone[] = [
  "Warm & Conversational",
  "Authoritative & Expert",
  "Fun & Casual",
  "Minimalist & Clean",
];

// ─── Pin Style Options (Section 2.2 Group 4) ───

export const PIN_STYLE_OPTIONS: PinStyle[] = [
  "TOBI (Text Over Background Image)",
  "Collage",
  "Pure Image",
  "All Three",
];

export const PIN_VARIANT_OPTIONS: PinVariantCount[] = [3, 5, 10];

// ─── Seasonal Override Options (Section 2.2 Group 5) ───

export const SEASONAL_OVERRIDE_OPTIONS: SeasonalOverride[] = [
  "Auto-detect",
  "Spring",
  "Summer",
  "Fall/Autumn",
  "Winter",
  "Holiday Season",
];

// ─── Link Attribute Options (Section 2.2 Group 3) ───

export const LINK_ATTRIBUTE_OPTIONS: LinkAttribute[] = [
  'sponsored noopener',
  'nofollow noopener',
  "Custom",
];

// ─── Validation Rules ───

export const KEYWORD_MIN_WORDS = 2;
export const KEYWORD_MAX_WORDS = 8;
export const MAX_PRODUCT_LINKS = 10;
export const MAX_AFFILIATE_LINK_DENSITY = 300; // 1 link per 300 words
export const MAX_H2_KEYWORD_REPEATS = 2; // main keyword in max 2 H2s
export const TITLE_MIN_LENGTH = 50;
export const TITLE_MAX_LENGTH = 60;
export const META_DESC_MIN_LENGTH = 120;
export const META_DESC_MAX_LENGTH = 160;
export const KEYWORD_DENSITY_MIN = 1; // 1%
export const KEYWORD_DENSITY_MAX = 2; // 2%
export const OPTIMAL_PASSAGE_MIN_WORDS = 134;
export const OPTIMAL_PASSAGE_MAX_WORDS = 167;
export const FAQ_MIN_COUNT = 5;
export const FAQ_MAX_COUNT = 7;
export const FAQ_ANSWER_MIN_WORDS = 50;
export const FAQ_ANSWER_MAX_WORDS = 100;
export const MIN_RECIPE_INGREDIENTS = 3;
export const MIN_RECIPE_STEPS = 3;
export const PIN_TITLE_MIN_CHARS = 40;
export const PIN_TITLE_MAX_CHARS = 100;
export const PIN_DESC_MIN_CHARS = 100;
export const PIN_DESC_MAX_CHARS = 500;
export const TOBI_MAX_WORDS = 8;
export const ROUNDUP_PREVIEW_MIN_WORDS = 80;
export const ROUNDUP_PREVIEW_MAX_WORDS = 150;
export const PERSONAL_STORY_MAX_WORDS = 200;
export const MIN_EXPERIENCE_SIGNALS = 2;
export const QUALITY_BLOCK_THRESHOLD = 70; // score below this = blocked
export const TTR_MIN = 0.55;
export const TTR_MAX = 0.75;

// ─── Pipeline Stage Labels (Section 12.3) ───

export const PIPELINE_STAGES = [
  { key: "research" as const, label: "Research", fullLabel: "Research & Planning" },
  { key: "content" as const, label: "Writing", fullLabel: "Content Generation" },
  { key: "images" as const, label: "Images", fullLabel: "Image Generation" },
  { key: "seo" as const, label: "SEO", fullLabel: "SEO Optimization" },
  { key: "pinterest" as const, label: "Pinterest", fullLabel: "Pinterest Optimization" },
  { key: "scoring" as const, label: "Scoring", fullLabel: "Quality Scoring & Delivery" },
];

// ─── Quality Score Bands (Section 2.7) ───

export const SCORE_BANDS = [
  { min: 90, max: 100, label: "Exceptional" as const, action: "Ready to publish", color: "#22c55e" },
  { min: 80, max: 89, label: "Strong" as const, action: "Minor improvements suggested", color: "#22c55e" },
  { min: 70, max: 79, label: "Acceptable" as const, action: "Fix flagged issues before publishing", color: "#eab308" },
  { min: 60, max: 69, label: "Below Standard" as const, action: "Significant revisions needed", color: "#ef4444" },
  { min: 0, max: 59, label: "Redo" as const, action: "Content does not meet minimum quality", color: "#ef4444" },
];

// ─── Pinterest Power Words (Section 2.6) ───

export const PINTEREST_POWER_WORDS = [
  "Easy", "Best", "Quick", "Simple", "Ultimate", "Perfect", "Delicious",
];

// ─── Default Form Values ───

export const DEFAULT_FORM_INPUTS: FormInputs = {
  core: {
    mainKeyword: "",
    contentType: "auto-detect",
    targetSite: "",
    wordCountTarget: "Medium (1500-2500)",
  },
  keywords: {
    secondaryKeywords: "",
    qualifierKeywords: "",
    contextualKeywords: "",
  },
  monetization: {
    productStoreUrl: "",
    productLinks: [],
    productCatalog: [],
    affiliateDisclosure: true,
    linkAttribute: 'sponsored noopener',
    amazonTag: "",
  },
  pinterest: {
    generatePinCopy: true,
    numberOfPinVariants: 5,
    pinStyle: "TOBI (Text Over Background Image)",
    targetBoards: "",
  },
  advanced: {
    writingPersona: "Professional Food Blogger",
    tone: "Warm & Conversational",
    includeRecipeCard: true,
    includeFaqSection: true,
    includeNutritionInfo: true,
    aiSearchOptimization: true,
    seasonalOverride: "Auto-detect",
  },
  imageSettings: {
    enabled: true,
    provider: "gemini",
    model: "nano-banana-pro-preview",
    promptInstructions: "You are a professional visual art director for a top lifestyle blog. Analyze this article and create a stunning featured image.\n\nArticle Title: {title}\nArticle Content Summary: {content}\n\nCreate a detailed image prompt that captures the essence of the recipe in a beautiful, appetizing way. Focus on natural lighting, rich colors, and professional food photography composition.",
    style: "Food & Kitchen",
    colorMood: "",
    dimensions: "WordPress Featured 1.91:1",
    imgbbApiKey: "",
  },
  wordpress: {
    siteUrl: "",
    username: "",
    appPassword: "",
    publishingMode: "draft",
  },
  batch: {
    mode: "single",
    keywords: [],
  },
  overrides: {
    articleTone: "Auto-detect",
    contentStrategy: "Cluster Content",
    h2Sections: "Auto",
    schemaType: "Auto-detect",
    titleFormula: "Auto-detect",
    authoritySource: "Auto-Select",
  },
};

// ─── FTC Disclosure (Section 4.1) ───

export const DEFAULT_FTC_DISCLOSURE =
  "This post may contain affiliate links. If you purchase through these links, I may earn a small commission at no extra cost to you. I only recommend products I personally use and love. See my full disclosure policy for details.";

// ─── Affiliate Link HTML Template (Section 4.2) ───

export const AFFILIATE_LINK_TEMPLATE = (url: string, text: string) =>
  `<a href="${url}" rel="sponsored noopener noreferrer" target="_blank" class="affiliate-link">${text}</a>`;

// ─── Image Specs (Section 5.2) ───

export const PINTEREST_IMAGE_WIDTH = 1000;
export const PINTEREST_IMAGE_HEIGHT = 1500;
export const PINTEREST_IMAGE_RATIO = "2:3";

// ─── Provider Models (Feature 1, 2) ───

export const CONTENT_MODELS: Record<ContentProvider, { value: string; label: string; description: string }[]> = {
  gemini: [
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", description: "Latest. Best reasoning, coding, agentic workflows. Feb 2026." },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", description: "Most powerful multimodal. Best for vibe-coding. Dec 2025." },
    { value: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash-Lite Preview", description: "Fastest & cheapest. High-volume tasks. Mar 2026." },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Stable flagship. Deep reasoning. Best for production." },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Stable. Best price-performance for reasoning tasks." },
  ],
  openai: [
    { value: "gpt-5.4", label: "GPT-5.4", description: "Frontier model. 1M context, computer use, tool search. Released Mar 5, 2026." },
    { value: "gpt-5.4-mini", label: "GPT-5.4 mini", description: "Lighter version of 5.4. Fast, affordable. Released Mar 18, 2026." },
    { value: "gpt-5.3-codex", label: "GPT-5.3 Codex", description: "Best for code generation and agentic coding. Released Feb 5, 2026." },
    { value: "gpt-5", label: "GPT-5", description: "Previous flagship. Strong reasoning and coding." },
    { value: "gpt-5-mini", label: "GPT-5 mini", description: "Cost-efficient reasoning model." },
    { value: "gpt-4.1", label: "GPT-4.1", description: "Versatile non-reasoning model. Good all-rounder." },
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini", description: "Budget-friendly. Great starting point." },
  ],
  anthropic: [
    { value: "claude-opus-4-6-20250205", label: "Claude Opus 4.6", description: "Most capable. 1M context, 128k output. Released Feb 5, 2026." },
    { value: "claude-sonnet-4-6-20250217", label: "Claude Sonnet 4.6", description: "Near-Opus performance at Sonnet pricing. Released Feb 17, 2026." },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", description: "Previous generation. Still strong for most tasks." },
    { value: "claude-3-5-haiku-20241022", label: "Claude Haiku 3.5", description: "Fastest, most affordable. Good for high-volume." },
  ],
  replicate: [
    { value: "openai/gpt-5", label: "GPT-5 (via Replicate)", description: "OpenAI's GPT-5 through Replicate." },
    { value: "openai/gpt-5-nano", label: "GPT-5 nano (via Replicate)", description: "Fast, low-latency GPT-5 variant." },
    { value: "deepseek-ai/deepseek-v3.2", label: "DeepSeek V3.2 (via Replicate)", description: "GPT-5-level performance. Open-weight. 685B params." },
    { value: "deepseek-ai/deepseek-v3.2-speciale", label: "DeepSeek V3.2 Speciale (via Replicate)", description: "Extended reasoning variant. Surpasses GPT-5." },
    { value: "anthropic/claude-4.5-sonnet", label: "Claude 4.5 Sonnet (via Replicate)", description: "Anthropic's model through Replicate." },
    { value: "anthropic/claude-4.5-haiku", label: "Claude 4.5 Haiku (via Replicate)", description: "Fast Anthropic model through Replicate." },
    { value: "meta/llama-4-scout", label: "Llama 4 Scout (via Replicate)", description: "Meta's latest open model." },
    { value: "qwen/qwen3.5-397b-a17b", label: "Qwen 3.5 (via Replicate)", description: "Alibaba's flagship. 397B MoE, multimodal." },
    { value: "openai/gpt-oss-120b", label: "gpt-oss-120b (via Replicate)", description: "OpenAI's open-weight model. Rivals o4-mini. Apache 2.0 license." },
  ]
};

export const IMAGE_MODELS: Record<ImageProvider, { value: string; label: string; description: string }[]> = {
  gemini: [
    { value: "gemini-3.1-flash-image-preview", label: "Nano Banana 2 (Fast)", description: "High-efficiency image generation. Fast & affordable. Feb 2026." },
    { value: "gemini-3-pro-image-preview", label: "Nano Banana Pro (Studio)", description: "Studio-quality 4K. Complex layouts, precise text. Nov 2025." },
  ],
  replicate: [
    { value: "ideogram-ai/ideogram-v2-turbo", label: "Ideogram", description: "Excellent text rendering in images." },
    { value: "SeeDream-4 Replicate endpoint", label: "SeeDream-4", description: "Advanced image generation." },
    { value: "SeeDream-4.5 Replicate endpoint", label: "SeeDream-4.5", description: "Latest SeeDream version." },
    { value: "black-forest-labs/flux-2-max", label: "Flux 2 Max", description: "High-end from Black Forest Labs." },
    { value: "recraft-ai/recraft-v3", label: "Recraft v3", description: "Professional design-focused." },
    { value: "Pruna AI Replicate endpoint", label: "Pruna AI ($0.01/img)", description: "Budget image generation." },
  ]
};

export const IMAGE_STYLE_OPTIONS: ImageStyle[] = [
  "Food & Kitchen",
  "Minimalist",
  "Rustic",
  "Modern",
  "Lifestyle",
  "Flat Lay",
];

export const IMAGE_DIMENSION_OPTIONS: { value: ImageDimensions; label: string; ratio: string }[] = [
  { value: "WordPress Featured 1.91:1", label: "WordPress Featured", ratio: "1.91:1" },
  { value: "Pinterest Portrait 2:3", label: "Pinterest Portrait", ratio: "2:3" },
  { value: "Blog Header 16:9", label: "Blog Header", ratio: "16:9" },
  { value: "Square 1:1", label: "Square", ratio: "1:1" },
];

// ─── Advanced Override Options (Feature 7) ───

export const ARTICLE_TONE_OPTIONS: ArticleTone[] = [
  "Auto-detect", "How-To Guide", "Informational", "List Post", "Comparison", "Review", "Story-Driven",
];

export const CONTENT_STRATEGY_OPTIONS: ContentStrategy[] = ["Pillar Content", "Cluster Content"];

export const H2_SECTION_OPTIONS: H2SectionCount[] = ["Auto", "5", "8", "10", "12", "15"];

export const SCHEMA_TYPE_OPTIONS: SchemaTypeOverride[] = [
  "Auto-detect", "Recipe", "Article", "ItemList", "HowTo", "FAQPage",
];

export const TITLE_FORMULA_OPTIONS: TitleFormula[] = [
  "Auto-detect",
  "[Number] + [Adjective] + [Keyword]",
  "[Keyword] + [Benefit]",
  "[How-To] + [Keyword]",
  "Custom",
];

export const AUTHORITY_SOURCE_OPTIONS: AuthoritySource[] = [
  "Auto-Select", "USDA", "FDA", "Harvard Health", "Mayo Clinic", "WebMD",
];

export const PUBLISHING_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "publish", label: "Publish Immediately" },
  { value: "draft", label: "Save as Draft" },
  { value: "pending", label: "Save as Pending Review" },
];
