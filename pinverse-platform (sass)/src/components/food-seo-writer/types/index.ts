// ─── Food SEO Writer v2.0 — TypeScript Interfaces ───

export type ContentProvider = 'gemini' | 'openai' | 'anthropic' | 'replicate';
export type ImageProvider = 'gemini' | 'replicate';

export interface ProviderSettings {
  contentProvider: ContentProvider;
  contentModel: string;
  contentApiKey: string;
  imageProvider: ImageProvider;
  imageModel: string;
  imageApiKey: string;
  useSharedKey: boolean;
}

// ─── Content Types (Section 2.2) ───

export type ContentType =
  | "auto-detect"
  | "Single Recipe Post"
  | "Recipe Roundup/Listicle"
  | "Meal Prep Guide"
  | "Product Review"
  | "Comparison Post"
  | "Holiday/Seasonal"
  | "Pillar Page";

export type WordCountTarget = "Short (800-1200)" | "Medium (1500-2500)" | "Long (3000-4500)";

export type WritingPersona =
  | "Professional Food Blogger"
  | "Home Cook Mom"
  | "Health & Wellness Expert"
  | "Chef"
  | "Custom";

export type Tone =
  | "Warm & Conversational"
  | "Authoritative & Expert"
  | "Fun & Casual"
  | "Minimalist & Clean";

export type PinStyle = "TOBI (Text Over Background Image)" | "Collage" | "Pure Image" | "All Three";

export type PinVariantCount = 3 | 5 | 10;

export type SeasonalOverride =
  | "Auto-detect"
  | "Spring"
  | "Summer"
  | "Fall/Autumn"
  | "Winter"
  | "Holiday Season";

export type LinkAttribute =
  | "sponsored noopener"
  | "nofollow noopener"
  | "Custom";

// ─── Pipeline Stages (Section 2.1) ───

export type PipelineStage =
  | "input"
  | "research"
  | "content"
  | "images"
  | "seo"
  | "pinterest"
  | "scoring";

export type StageStatus = "pending" | "active" | "completed" | "error";

export interface PipelineProgress {
  currentStage: PipelineStage;
  stages: Record<PipelineStage, StageStatus>;
  logs: string[];
  error?: string;
}

// ─── Input Form Types (Section 2.2) ───

export interface ProductLink {
  productName: string;
  url: string;
}

export interface CoreInputs {
  mainKeyword: string;
  contentType: ContentType;
  targetSite: string;
  wordCountTarget: WordCountTarget;
}

export interface KeywordTiers {
  secondaryKeywords: string;
  qualifierKeywords: string;
  contextualKeywords: string;
}

export interface ProductCatalogItem {
  productName: string;
  url: string;
}

export interface MonetizationInputs {
  productStoreUrl: string;
  productLinks: ProductLink[];
  productCatalog: ProductCatalogItem[];
  affiliateDisclosure: boolean;
  linkAttribute: LinkAttribute;
  amazonTag: string;
}

export interface PinterestOptions {
  generatePinCopy: boolean;
  numberOfPinVariants: PinVariantCount;
  pinStyle: PinStyle;
  targetBoards: string;
}

export interface AdvancedOptions {
  writingPersona: WritingPersona;
  tone: Tone;
  includeRecipeCard: boolean;
  includeFaqSection: boolean;
  includeNutritionInfo: boolean;
  aiSearchOptimization: boolean;
  seasonalOverride: SeasonalOverride;
}

// ─── Image Generation Settings (Feature 1) ───
// ImageProvider defined at top

export type ImageStyle =
  | "Food & Kitchen"
  | "Minimalist"
  | "Rustic"
  | "Modern"
  | "Lifestyle"
  | "Flat Lay";

export type ImageDimensions =
  | "WordPress Featured 1.91:1"
  | "Pinterest Portrait 2:3"
  | "Blog Header 16:9"
  | "Square 1:1";

export interface ImageSettings {
  enabled: boolean;
  provider: ImageProvider;
  model: string;
  promptInstructions: string;
  style: ImageStyle;
  colorMood: string;
  dimensions: ImageDimensions;
  imgbbApiKey: string;
}

// ─── WordPress Publishing Settings (Feature 3) ───

export type PublishingMode = "publish" | "draft" | "pending";

export interface WordPressSettings {
  siteUrl: string;
  username: string;
  appPassword: string;
  publishingMode: PublishingMode;
}

// ─── Batch Processing Settings (Feature 5) ───

export type KeywordMode = "single" | "batch";

export interface BatchSettings {
  mode: KeywordMode;
  keywords: string[];
}

// ─── Advanced SEO Overrides (Feature 7) ───

export type ArticleTone =
  | "Auto-detect"
  | "How-To Guide"
  | "Informational"
  | "List Post"
  | "Comparison"
  | "Review"
  | "Story-Driven";

export type ContentStrategy = "Pillar Content" | "Cluster Content";

export type H2SectionCount = "Auto" | "5" | "8" | "10" | "12" | "15";

export type SchemaTypeOverride =
  | "Auto-detect"
  | "Recipe"
  | "Article"
  | "ItemList"
  | "HowTo"
  | "FAQPage";

export type TitleFormula =
  | "Auto-detect"
  | "[Number] + [Adjective] + [Keyword]"
  | "[Keyword] + [Benefit]"
  | "[How-To] + [Keyword]"
  | "Custom";

export type AuthoritySource =
  | "Auto-Select"
  | "USDA"
  | "FDA"
  | "Harvard Health"
  | "Mayo Clinic"
  | "WebMD";

export interface AdvancedOverrides {
  articleTone: ArticleTone;
  contentStrategy: ContentStrategy;
  h2Sections: H2SectionCount;
  schemaType: SchemaTypeOverride;
  titleFormula: TitleFormula;
  authoritySource: AuthoritySource;
}

// ─── Image Generation Result ───

export interface GeneratedImage {
  sectionHeading: string;
  altText: string;
  hostedUrl: string;
  imgbbDeleteUrl?: string;
  isFeatured?: boolean;
}

// ─── Full Form Inputs ───

export interface FormInputs {
  core: CoreInputs;
  keywords: KeywordTiers;
  monetization: MonetizationInputs;
  pinterest: PinterestOptions;
  advanced: AdvancedOptions;
  imageSettings: ImageSettings;
  wordpress: WordPressSettings;
  batch: BatchSettings;
  overrides: AdvancedOverrides;
}

// ─── Research & Planning Output (Section 2.3) ───

export type SearchIntent = "informational" | "transactional" | "navigational";

export interface OutlineHeading {
  level: "h1" | "h2" | "h3";
  text: string;
  plannedWordCount: number;
  hasImagePlacement: boolean;
  affiliateLinkPlanned: boolean;
}

export interface ResearchResult {
  searchIntent: SearchIntent;
  selectedTemplate: ContentType;
  seasonalRelevance: string;
  competitionLevel: string;
  suggestedSecondaryKeywords: string[];
  suggestedContextualKeywords: string[];
  outline: OutlineHeading[];
  title: string;
  metaDescription: string;
  urlSlug: string;
}

// ─── Content Generation Output (Sections 2.4, 2.5) ───

export interface RecipeCard {
  name: string;
  description: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: string;
  calories: string;
  ingredients: string[];
  instructions: string[];
  nutritionFacts: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
    sugar: string;
    sodium: string;
  };
  storage: string;
  notes: string[];
}

export interface GeneratedContent {
  title: string;
  articleHtml: string;
  metaDescription: string;
  urlSlug: string;
  wordCount: number;
  recipeCards: RecipeCard[];
  faqItems: { question: string; answer: string }[];
  ftcDisclosure?: string;
}

// ─── SEO Optimization Output (Section 2.5) ───

export interface SeoCheckResult {
  name: string;
  passed: boolean;
  details: string;
  autoFixApplied?: boolean;
}

export interface SeoOptimizationResult {
  checklist: SeoCheckResult[];
  rankMathScore: number;
  optimizedContent: string;
  optimizedTitle: string;
  optimizedMetaDescription: string;
}

// ─── Pinterest Output (Section 2.6) ───

export interface PinTitle {
  index: number;
  text: string;
  charCount: number;
}

export interface PinDescription {
  index: number;
  text: string;
  charCount: number;
}

export interface TobiOverlay {
  index: number;
  text: string;
  wordCount: number;
}

export interface BoardSuggestion {
  name: string;
  description: string;
}

export interface HiddenPinCopy {
  title: string;
  description: string;
  tobiText: string;
}

export interface PinterestCopyResult {
  pinTitles: PinTitle[];
  pinDescriptions: PinDescription[];
  tobiOverlays: TobiOverlay[];
  boardSuggestions: BoardSuggestion[];
  hiddenPins: HiddenPinCopy[];
  ogMetaTags: string;
  dataPinDescriptions: string[];
  pinImages?: GeneratedImage[];
}

// ─── Schema Types (Section 3) ───

export interface RecipeSchema {
  "@context": string;
  "@type": "Recipe";
  name: string;
  image?: string[];
  author?: { "@type": "Person"; name: string };
  datePublished: string;
  description: string;
  prepTime: string;
  cookTime?: string;
  totalTime: string;
  recipeYield: string;
  recipeCategory: string;
  recipeCuisine: string;
  keywords: string;
  nutrition?: {
    "@type": "NutritionInformation";
    calories: string;
    proteinContent: string;
    carbohydrateContent: string;
    fatContent: string;
    fiberContent: string;
    sugarContent: string;
    sodiumContent: string;
  };
  recipeIngredient: string[];
  recipeInstructions: {
    "@type": "HowToStep";
    name: string;
    text: string;
    url?: string;
    image?: string;
  }[];
  // aggregateRating intentionally omitted — Google penalizes fake ratings
}

export interface FaqSchema {
  "@context": string;
  "@type": "FAQPage";
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }[];
}

export interface ArticleSchema {
  "@context": string;
  "@type": "Article";
  headline: string;
  description: string;
  image?: string;
  author?: { "@type": "Person"; name: string; url?: string };
  publisher?: {
    "@type": "Organization";
    name: string;
    logo?: { "@type": "ImageObject"; url: string };
  };
  datePublished: string;
  dateModified: string;
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
}

export type SchemaValidationStatus = "valid" | "warning" | "error";

export interface SchemaValidation {
  status: SchemaValidationStatus;
  message: string;
  field?: string;
}

export interface SchemaResult {
  recipeSchema?: RecipeSchema;
  recipeValidation: SchemaValidation[];
  faqSchema?: FaqSchema;
  faqValidation: SchemaValidation[];
  articleSchema?: ArticleSchema;
  articleValidation: SchemaValidation[];
}

// ─── Quality Scoring (Section 2.7) ───

export interface QualityCheck {
  name: string;
  maxPoints: number;
  earnedPoints: number;
  criteria: string;
  issue?: string;
  fixSuggestion?: string;
}

export interface QualityCategory {
  name: string;
  maxPoints: number;
  earnedPoints: number;
  checks: QualityCheck[];
}

export type ScoreBand = "Exceptional" | "Strong" | "Acceptable" | "Below Standard" | "Redo";

export interface QualityScoreResult {
  totalScore: number;
  maxScore: number;
  band: ScoreBand;
  categories: QualityCategory[];
  blockedIssues: string[];
}

// ─── AI Detection (Section 7) ───

export interface BlacklistedPhrase {
  phrase: string;
  replacement: string;
  found: boolean;
  count: number;
}

export interface BurstinessResult {
  shortSentences: number;
  mediumSentences: number;
  longSentences: number;
  veryLongSentences: number;
  isHealthy: boolean;
  message: string;
}

export interface AiDetectionResult {
  flaggedPhrases: BlacklistedPhrase[];
  burstiness: BurstinessResult;
  ttr: number;
  ttrHealthy: boolean;
  personalVoiceInjectionPoints: string[];
}

// ─── Seasonal Calendar (Section 9) ───

export interface SeasonalSuggestion {
  currentMonth: string;
  suggestedContent: string;
  pinterestPeakPeriod: string;
  tip: string;
}

// ─── Export Types (Section 8.2) ───

export type ExportFormat = "clipboard" | "wordpress" | "bulkpin-csv" | "zip";

export interface BulkPinCsvRow {
  pin_title: string;
  pin_description: string;
  destination_url: string;
  board_name: string;
  tobi_text: string;
  image_alt: string;
  image_url?: string;
}

// ─── Full Pipeline Result ───

export interface PipelineResult {
  research: ResearchResult;
  content: GeneratedContent;
  seo: SeoOptimizationResult;
  pinterest: PinterestCopyResult;
  schemas: SchemaResult;
  quality: QualityScoreResult;
  aiDetection: AiDetectionResult;
  generatedImages?: GeneratedImage[];
}

// ─── Batch Processing Result ───

export interface BatchResult {
  keyword: string;
  result: PipelineResult | null;
  error?: string;
}
