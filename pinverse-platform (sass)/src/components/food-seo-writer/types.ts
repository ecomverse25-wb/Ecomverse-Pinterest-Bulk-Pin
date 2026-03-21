// ─── Food SEO Writer Types ───

// Re-export shared types from Blog Monetizer
export type {
    ImageStyle, ImageDimensions, ImageProvider, WritingProvider,
    AffiliateLink, ParsedKeyword, FeaturedImageSettings, WPCredentials,
    SectionImage, PinData, PinStyleType,
} from "@/components/blog-monetizer/BlogMonetizer.types";

export {
    GEMINI_WRITING_MODELS, CLAUDE_WRITING_MODELS, OPENAI_WRITING_MODELS, REPLICATE_WRITING_MODELS,
    GOOGLE_IMAGE_MODELS, REPLICATE_IMAGE_MODELS,
    DEFAULT_WRITING_MODELS, DEFAULT_IMAGE_MODELS,
    WRITING_MODELS_BY_PROVIDER, IMAGE_MODELS_BY_PROVIDER,
    IMAGE_STYLE_OPTIONS, IMAGE_DIMENSION_OPTIONS, IMAGE_STYLE_SUFFIXES,
    DEFAULT_IMAGE_PROMPT_TEMPLATE,
    PIN_STYLE_OPTIONS, ALL_PIN_STYLES,
} from "@/components/blog-monetizer/BlogMonetizer.types";

// ─── Food-Specific Types ───

export type ContentStrategy = 'pillar' | 'cluster';

export type FoodTone = 'how-to' | 'listicle' | 'comparison' | 'personal-story';

export type FoodH2Count = 6 | 8 | 10 | 12 | 15;

export type TitleFormula =
    | 'number-adjective-keyword-benefit'
    | 'how-to-keyword-outcome'
    | 'best-number-keyword-audience'
    | 'ultimate-guide-keyword';

export type SchemaType = 'auto-detect' | 'ItemList' | 'HowTo' | 'Recipe' | 'Article';

export type AuthoritySource =
    | 'auto-select'
    | 'usda'
    | 'harvard'
    | 'mayo-clinic'
    | 'cdc'
    | 'nih'
    | 'aha';

export type FaqCount = 4 | 5 | 6;

// ─── AI Keyword Analysis Types ───

export type SearchIntent =
    | 'listicle'
    | 'howto'
    | 'recipe'
    | 'informational'
    | 'roundup'
    | 'comparison';

export interface KeywordAnalysis {
    keyword: string;
    intent: SearchIntent;
    searchIntentReason: string;
    schemaType: SchemaType;
    contentStrategy: ContentStrategy;
    titleFormula: TitleFormula;
    tone: FoodTone;
    h2Count: FoodH2Count;
    authoritySource: AuthoritySource;
    authorityUrl: string;
    suggestedTitle: string;
    estimatedWordCount: number;
    pinterestBoardSuggestion: string;
    isFallback?: boolean;
}

// ─── Settings Interface ───

export interface FoodSeoSettings {
    niche: string;
    contentStrategy: ContentStrategy;
    tone: FoodTone;
    h2Count: FoodH2Count;
    titleFormula: TitleFormula;
    schemaType: SchemaType;
    authoritySource: AuthoritySource;
    faqCount: FaqCount;
    internalLinkTopics: string;
    pinterestOutput: boolean;
    affiliateLinks: { productName: string; url: string }[];
    featuredImage: {
        promptTemplate: string;
        style: import("@/components/blog-monetizer/BlogMonetizer.types").ImageStyle;
        colorMood: string;
        dimensions: import("@/components/blog-monetizer/BlogMonetizer.types").ImageDimensions;
    };
    amazonAffiliateTag?: string;
    publishMode: 'draft' | 'publish';
    storeProducts: Array<{ name: string; url: string; description?: string }>;
}

// ─── Article Interface ───

export interface FoodArticle {
    keyword: string;
    title: string;
    content: string;
    metaDescription: string;
    wordCount: number;
    featuredImageUrl?: string;
    featuredImagePrompt?: string;
    sectionImages: import("@/components/blog-monetizer/BlogMonetizer.types").SectionImage[];
    status: 'pending' | 'generating' | 'ready' | 'error' | 'published';
    errorMessage?: string;
    imageError?: string;
    wpLink?: string;
    wpPostId?: number;
    // Food SEO-specific fields
    pinTitle?: string;
    pinDescription?: string;
    schemaMarkup?: string;
    tags?: string[];
}

// ─── Batch Queue Types ───

export type BatchItemStatus =
    | 'queued'
    | 'generating'
    | 'ready'
    | 'error'

export interface BatchQueueItem {
    id: string;
    keyword: string;
    status: BatchItemStatus;
    wordCount?: number;
    estimatedRankMathScore?: number;
    errorMessage?: string;
    articleId?: string;
}
