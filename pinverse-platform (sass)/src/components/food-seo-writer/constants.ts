// ─── Food SEO Writer Constants ───

import type {
    ContentStrategy, FoodTone, FoodH2Count,
    TitleFormula, SchemaType, AuthoritySource, FaqCount,
    FoodSeoSettings, SearchIntent,
} from "./types";
import { DEFAULT_IMAGE_PROMPT_TEMPLATE } from "./types";

// ─── Content Strategy Options ───
export const CONTENT_STRATEGY_OPTIONS: { value: ContentStrategy; label: string; emoji: string; tooltip: string }[] = [
    {
        value: 'pillar',
        label: 'Pillar Content',
        emoji: '🏛️',
        tooltip: 'Broad keyword, 2000+ words, targets category-level traffic',
    },
    {
        value: 'cluster',
        label: 'Cluster Content',
        emoji: '🔗',
        tooltip: 'Long-tail keyword, 1200-1500 words, targets specific searches',
    },
];

// ─── Food Tone Options ───
export const FOOD_TONE_OPTIONS: { value: FoodTone; label: string }[] = [
    { value: 'how-to', label: 'How-To Guide' },
    { value: 'listicle', label: 'Listicle' },
    { value: 'comparison', label: 'Comparison' },
    { value: 'personal-story', label: 'Personal Story' },
];

// ─── H2 Count Options ───
export const FOOD_H2_OPTIONS: FoodH2Count[] = [6, 8, 10, 12, 15];

// ─── Title Formula Options ───
export const TITLE_FORMULA_OPTIONS: { value: TitleFormula; label: string; example: string }[] = [
    {
        value: 'number-adjective-keyword-benefit',
        label: '[Number] + [Adjective] + [Keyword] + [Benefit]',
        example: '15 Easy Healthy Dinner Recipes the Whole Family Will Love',
    },
    {
        value: 'how-to-keyword-outcome',
        label: 'How to + [Keyword] + [Outcome]',
        example: 'How to Make Healthy Dinner Recipes Your Family Will Request Weekly',
    },
    {
        value: 'best-number-keyword-audience',
        label: 'Best [Number] + [Keyword] + for [Audience]',
        example: 'Best 12 Healthy Dinner Recipes for Busy Weeknight Families',
    },
    {
        value: 'ultimate-guide-keyword',
        label: 'The Ultimate Guide to [Keyword]',
        example: 'The Ultimate Guide to Healthy Dinner Recipes',
    },
];

// ─── Schema Type Options ───
export const SCHEMA_TYPE_OPTIONS: { value: SchemaType; label: string; description: string }[] = [
    { value: 'auto-detect', label: 'Auto-Detect', description: 'AI picks based on content' },
    { value: 'ItemList', label: 'ItemList', description: 'For listicles' },
    { value: 'HowTo', label: 'HowTo', description: 'For step-by-step guides' },
    { value: 'Recipe', label: 'Recipe', description: 'For single recipe posts' },
    { value: 'Article', label: 'Article', description: 'For general food content' },
];

// ─── Authority Source Options ───
export const AUTHORITY_SOURCE_OPTIONS: { value: AuthoritySource; label: string }[] = [
    { value: 'auto-select', label: 'Auto-Select' },
    { value: 'usda', label: 'USDA Dietary Guidelines (dietaryguidelines.gov)' },
    { value: 'harvard', label: 'Harvard T.H. Chan School of Public Health' },
    { value: 'mayo-clinic', label: 'Mayo Clinic' },
    { value: 'cdc', label: 'CDC - Nutrition' },
    { value: 'nih', label: 'NIH - National Institutes of Health' },
    { value: 'aha', label: 'American Heart Association' },
];

// ─── FAQ Count Options ───
export const FAQ_COUNT_OPTIONS: FaqCount[] = [4, 5, 6];

// ─── Default Settings ───
export const DEFAULT_FOOD_SEO_SETTINGS: FoodSeoSettings = {
    niche: 'healthy recipes',
    contentStrategy: 'cluster',
    tone: 'listicle',
    h2Count: 10,
    titleFormula: 'number-adjective-keyword-benefit',
    schemaType: 'auto-detect',
    authoritySource: 'auto-select',
    faqCount: 5,
    internalLinkTopics: '',
    pinterestOutput: true,
    affiliateLinks: [],
    featuredImage: {
        promptTemplate: DEFAULT_IMAGE_PROMPT_TEMPLATE,
        style: 'food',
        colorMood: '',
        dimensions: '1200x628',
    },
};

// ─── Strategy → Auto-set mappings ───
export const STRATEGY_DEFAULTS: Record<ContentStrategy, { h2Count: FoodH2Count; articleLength: string; wordTarget: number }> = {
    pillar: { h2Count: 15, articleLength: 'Long (2000+ words)', wordTarget: 2000 },
    cluster: { h2Count: 10, articleLength: 'Standard (1500 words)', wordTarget: 1500 },
};

// ─── Authority Source URLs ───
export const AUTHORITY_SOURCE_URLS: Record<AuthoritySource, string> = {
    'auto-select': '',
    'usda': 'https://www.dietaryguidelines.gov/',
    'harvard': 'https://www.hsph.harvard.edu/nutritionsource/',
    'mayo-clinic': 'https://www.mayoclinic.org/healthy-lifestyle/nutrition-and-healthy-eating',
    'cdc': 'https://www.cdc.gov/nutrition/',
    'nih': 'https://www.nih.gov/health-information',
    'aha': 'https://www.heart.org/en/healthy-living/healthy-eating',
};

// ─── Title Formula Labels (for prompt) ───
export const TITLE_FORMULA_DESCRIPTIONS: Record<TitleFormula, string> = {
    'number-adjective-keyword-benefit': '[Number] + [Adjective] + [Keyword] + [Benefit] — e.g. "15 Easy Healthy Dinner Recipes the Whole Family Will Love"',
    'how-to-keyword-outcome': 'How to + [Keyword] + [Outcome] — e.g. "How to Make Healthy Dinner Recipes Your Family Will Request Weekly"',
    'best-number-keyword-audience': 'Best [Number] + [Keyword] + for [Audience] — e.g. "Best 12 Healthy Dinner Recipes for Busy Weeknight Families"',
    'ultimate-guide-keyword': 'The Ultimate Guide to [Keyword] — e.g. "The Ultimate Guide to Healthy Dinner Recipes"',
};

// ─── Rank Math Weight Map (shared between FoodSeoWriter and ContentStudioTab) ───
export const RANK_MATH_WEIGHTS: Record<string, number> = {
    'Focus keyword in H1 title': 8,
    'Focus keyword in first 100 words': 8,
    'Focus keyword in meta description': 8,
    'Image alt text contains keyword': 8,
    'Internal links present': 6,
    'External DoFollow link present': 6,
    'FAQ section present': 5,
    'Word count ≥ 1200': 10,
    'Schema markup generated': 10,
    'Keyword density 0.5%-1.5%': 8,
    'H2 count matches requested': 7,
    'Concluding paragraph present': 5,
};
export const RANK_MATH_MAX = 89;

// ─── AI Keyword Analysis Fallbacks ───

export const INTENT_SIGNALS: Record<string, string[]> = {
    listicle: [
        'recipes', 'ideas', 'meals', 'dinners', 'breakfasts', 'lunches',
        'snacks', 'ways', 'tips', 'foods', 'dishes', 'options',
    ],
    howto: [
        'how to', 'how do', 'guide to', 'tutorial', 'step by step',
        'learn to', 'make', 'cook', 'prepare', 'bake',
    ],
    recipe: ['recipe', 'recipe for', 'homemade', 'from scratch'],
    informational: [
        'what is', 'what are', 'benefits of', 'best time to',
        'why', 'difference between',
    ],
    comparison: ['vs', 'versus', 'compared to', 'better than'],
    roundup: ['best', 'top', 'favorite', 'must try'],
};

export const AUTHORITY_KEYWORD_MAP: Record<string, AuthoritySource> = {
    'weight loss': 'harvard',
    'losing weight': 'harvard',
    'low calorie': 'harvard',
    'diet': 'harvard',
    'heart healthy': 'aha',
    'cholesterol': 'aha',
    'cardiac': 'aha',
    'diabetic': 'mayo-clinic',
    'diabetes': 'mayo-clinic',
    'blood sugar': 'mayo-clinic',
    'high protein': 'nih',
    'nutrition': 'usda',
    'healthy eating': 'usda',
    'balanced diet': 'usda',
};

export const INTENT_LABELS: Record<SearchIntent, { emoji: string; label: string }> = {
    listicle: { emoji: '📋', label: 'Listicle' },
    howto: { emoji: '🔧', label: 'How-To' },
    recipe: { emoji: '🍳', label: 'Recipe' },
    informational: { emoji: '📖', label: 'Informational' },
    roundup: { emoji: '🏆', label: 'Roundup' },
    comparison: { emoji: '⚖️', label: 'Comparison' },
};
