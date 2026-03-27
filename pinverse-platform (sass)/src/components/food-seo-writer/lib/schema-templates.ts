// ─── Food SEO Writer v2.0 — Schema Templates (Section 3) ───

import type {
  RecipeSchema,
  FaqSchema,
  ArticleSchema,
  SchemaValidation,
  RecipeCard,
  GeneratedContent,
} from "../types";
import { MIN_RECIPE_INGREDIENTS, MIN_RECIPE_STEPS } from "./constants";

// ─── ISO 8601 Duration Helpers ───

/**
 * Convert "X minutes" or "X hours Y minutes" to ISO 8601 duration format (e.g., PT30M, PT1H30M)
 */
export function toISO8601Duration(timeStr: string): string {
  if (!timeStr) return "PT0M";

  const hourMatch = timeStr.match(/(\d+)\s*h(?:ours?)?/i);
  const minMatch = timeStr.match(/(\d+)\s*m(?:in(?:utes?)?)?/i);
  // Also handle plain numbers as minutes
  const plainNumMatch = timeStr.match(/^(\d+)$/);

  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minMatch
    ? parseInt(minMatch[1])
    : plainNumMatch
      ? parseInt(plainNumMatch[1])
      : 0;

  if (hours > 0 && minutes > 0) return `PT${hours}H${minutes}M`;
  if (hours > 0) return `PT${hours}H`;
  return `PT${minutes}M`;
}

// ─── 3.1 Recipe JSON-LD Generation ───

export function generateRecipeSchema(
  recipe: RecipeCard,
  articleTitle: string,
  metaDescription: string,
  mainKeyword: string,
  secondaryKeywords: string,
  authorName: string = "[Author Name]",
  imageUrl: string = "[Image URL]",
  postUrl: string = "[Post URL]"
): { schema: RecipeSchema; validations: SchemaValidation[] } {
  const validations: SchemaValidation[] = [];

  // Build schema — FIX 7: omit placeholder fields instead of outputting literal placeholders
  const isPlaceholderImage = !imageUrl || imageUrl === "[Image URL]";
  const isPlaceholderAuthor = !authorName || authorName === "[Author Name]";
  const parsedCookTime = toISO8601Duration(recipe.cookTime);
  const isNoCook = parsedCookTime === "PT0M";

  const schema: RecipeSchema = {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    name: recipe.name || articleTitle,
    // Omit image if placeholder
    ...(isPlaceholderImage ? {} : { image: [imageUrl] }),
    // Omit author if placeholder
    ...(isPlaceholderAuthor ? {} : { author: { "@type": "Person" as const, name: authorName } }),
    datePublished: new Date().toISOString().split("T")[0],
    description: metaDescription || recipe.description || "",
    prepTime: toISO8601Duration(recipe.prepTime),
    // Omit cookTime if PT0M (no-cook/blended recipe)
    ...(isNoCook ? {} : { cookTime: parsedCookTime }),
    totalTime: toISO8601Duration(recipe.totalTime),
    recipeYield: recipe.servings || "4 servings",
    recipeCategory: "Dinner", // Can be overridden
    recipeCuisine: "American", // Can be overridden
    keywords: [mainKeyword, secondaryKeywords].filter(Boolean).join(", "),
    recipeIngredient: recipe.ingredients || [],
    recipeInstructions: (recipe.instructions || []).map((step: string, i: number) => ({
      "@type": "HowToStep" as const,
      name: `Step ${i + 1}`,
      text: step,
      url: `${postUrl}#step${i + 1}`,
    })),
    // NOTE: aggregateRating intentionally omitted.
    // Only include if your post has REAL user ratings.
    // Google penalizes fake ratings per Section 3.1.
  };

  // Add nutrition if available
  if (recipe.nutritionFacts && recipe.nutritionFacts.calories) {
    schema.nutrition = {
      "@type": "NutritionInformation",
      calories: `${recipe.nutritionFacts.calories} calories`,
      proteinContent: `${recipe.nutritionFacts.protein} grams`,
      carbohydrateContent: `${recipe.nutritionFacts.carbs} grams`,
      fatContent: `${recipe.nutritionFacts.fat} grams`,
      fiberContent: `${recipe.nutritionFacts.fiber} grams`,
      sugarContent: `${recipe.nutritionFacts.sugar} grams`,
      sodiumContent: `${recipe.nutritionFacts.sodium} milligrams`,
    };
  }

  // ─── Validation Rules (Section 3.1) ───

  if (!schema.name) {
    validations.push({ status: "error", message: "Recipe name is required", field: "name" });
  }
  if (!schema.image || schema.image.length === 0 || schema.image[0] === "[Image URL]") {
    validations.push({
      status: "warning",
      message: "⚠ Add your featured image URL to the Recipe Schema image field before submitting to Google.",
      field: "image",
    });
  }
  if (schema.recipeIngredient.length < MIN_RECIPE_INGREDIENTS) {
    validations.push({
      status: "error",
      message: `Minimum ${MIN_RECIPE_INGREDIENTS} ingredients required (found ${schema.recipeIngredient.length})`,
      field: "recipeIngredient",
    });
  }
  if (schema.recipeInstructions.length < MIN_RECIPE_STEPS) {
    validations.push({
      status: "error",
      message: `Minimum ${MIN_RECIPE_STEPS} steps required (found ${schema.recipeInstructions.length})`,
      field: "recipeInstructions",
    });
  }
  if (!schema.prepTime || schema.prepTime === "PT0M") {
    validations.push({
      status: "error",
      message: "Prep time is required in ISO 8601 format (e.g., PT30M)",
      field: "prepTime",
    });
  }
  if (!schema.cookTime) {
    validations.push({
      status: "warning",
      message: "Cook time omitted (no-cook/blended recipe) — this is acceptable for Google.",
      field: "cookTime",
    });
  }
  if (!schema.totalTime || schema.totalTime === "PT0M") {
    validations.push({
      status: "error",
      message: "Total time is required in ISO 8601 format",
      field: "totalTime",
    });
  }
  if (!schema.recipeYield) {
    validations.push({
      status: "error",
      message: "Recipe yield (servings) is required",
      field: "recipeYield",
    });
  }
  if (!schema.nutrition) {
    validations.push({
      status: "warning",
      message: "Nutrition info is strongly recommended — it impacts Rich Pin quality",
      field: "nutrition",
    });
  }

  // Good validation
  if (validations.filter((v) => v.status === "error").length === 0) {
    validations.push({
      status: "valid",
      message: "Recipe schema is valid with all required fields",
    });
  }

  return { schema, validations };
}

// ─── 3.2 FAQPage JSON-LD Generation ───

export function generateFaqSchema(
  faqItems: { question: string; answer: string }[]
): { schema: FaqSchema; validations: SchemaValidation[] } {
  const validations: SchemaValidation[] = [];

  const schema: FaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question" as const,
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: item.answer,
      },
    })),
  };

  // Validation rules
  if (faqItems.length < 5) {
    validations.push({
      status: "warning",
      message: `Minimum 5 questions recommended (found ${faqItems.length})`,
    });
  }
  if (faqItems.length > 7) {
    validations.push({
      status: "warning",
      message: `Maximum 7 questions recommended (found ${faqItems.length})`,
    });
  }

  // Check question phrasing
  const naturalPhrasing = /^(how|what|why|can|should|is|are|do|does|when|where|which)/i;
  const unnaturalQuestions = faqItems.filter((q) => !naturalPhrasing.test(q.question));
  if (unnaturalQuestions.length > 0) {
    validations.push({
      status: "warning",
      message: `${unnaturalQuestions.length} question(s) don't use natural phrasing (should start with how, what, why, can, should)`,
    });
  }

  if (validations.filter((v) => v.status === "error").length === 0) {
    validations.push({
      status: "valid",
      message: "FAQ schema is valid",
    });
  }

  return { schema, validations };
}

// ─── 3.3 Article JSON-LD Generation ───

/** Returns undefined if value is a placeholder like [Author Name] or [Image URL] */
function cleanField(value: string | undefined): string | undefined {
  if (!value || (value.includes("[") && value.includes("]"))) return undefined;
  return value;
}

export function generateArticleSchema(
  title: string,
  metaDescription: string,
  authorName: string = "[Author Name]",
  authorUrl: string = "[Author URL]",
  siteName: string = "[Site Name]",
  siteLogoUrl: string = "[Logo URL]",
  featuredImageUrl: string = "[Featured Image URL]",
  postUrl: string = "[Post URL]"
): { schema: ArticleSchema; validations: SchemaValidation[] } {
  const validations: SchemaValidation[] = [];
  const today = new Date().toISOString().split("T")[0];

  const cleanAuthorName = cleanField(authorName);
  const cleanAuthorUrl = cleanField(authorUrl);
  const cleanSiteName = cleanField(siteName);
  const cleanLogoUrl = cleanField(siteLogoUrl);
  const cleanImage = cleanField(featuredImageUrl);

  const schema: ArticleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: metaDescription,
    // Omit image if placeholder
    ...(cleanImage ? { image: cleanImage } : {}),
    // Omit author if name is placeholder
    ...(cleanAuthorName
      ? {
          author: {
            "@type": "Person" as const,
            name: cleanAuthorName,
            ...(cleanAuthorUrl ? { url: cleanAuthorUrl } : {}),
          },
        }
      : {}),
    // Omit publisher if name is placeholder
    ...(cleanSiteName
      ? {
          publisher: {
            "@type": "Organization" as const,
            name: cleanSiteName,
            ...(cleanLogoUrl
              ? { logo: { "@type": "ImageObject" as const, url: cleanLogoUrl } }
              : {}),
          },
        }
      : {}),
    datePublished: today,
    dateModified: today,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  };

  // Validations
  if (!title) {
    validations.push({ status: "error", message: "Headline is required", field: "headline" });
  }
  if (!metaDescription) {
    validations.push({
      status: "error",
      message: "Description is required",
      field: "description",
    });
  }
  if (featuredImageUrl === "[Featured Image URL]") {
    validations.push({
      status: "warning",
      message: "Add your featured image URL",
      field: "image",
    });
  }
  if (authorName === "[Author Name]") {
    validations.push({
      status: "warning",
      message: "Set your author name",
      field: "author",
    });
  }

  if (validations.filter((v) => v.status === "error").length === 0) {
    validations.push({
      status: "valid",
      message: "Article schema is valid",
    });
  }

  return { schema, validations };
}

// ─── Parse Recipe Card from Generated Content ───

/**
 * Extract recipe card data from generated article HTML for schema generation.
 * Bug Fix 1: Handles both markdown-style and HTML-formatted recipe data.
 */
export function extractRecipeFromContent(content: string): RecipeCard | null {
  // Work with a text version for some matching, but keep HTML for list extraction
  const text = content.replace(/<[^>]*>/g, "\n");

  // Look for recipe card markers — handle both **bold** and <strong> formats
  const prepMatch =
    text.match(/\*\*Prep Time:\*\*\s*(.+)/i) ||
    text.match(/Prep Time:\s*(.+)/i);
  const cookMatch =
    text.match(/\*\*Cook Time:\*\*\s*(.+)/i) ||
    text.match(/Cook Time:\s*(.+)/i);
  const totalMatch =
    text.match(/\*\*Total Time:\*\*\s*(.+)/i) ||
    text.match(/Total Time:\s*(.+)/i);
  const servingsMatch =
    text.match(/\*\*Servings:\*\*\s*(.+)/i) ||
    text.match(/Servings:\s*(.+)/i);
  const caloriesMatch =
    text.match(/\*\*Calories:\*\*\s*(.+)/i) ||
    text.match(/Calories:\s*(.+)/i);

  if (!prepMatch && !cookMatch) return null;

  // Extract ingredients — try HTML list items first, then plain text
  let ingredients: string[] = [];

  // Method 1: HTML <li> elements under Ingredients heading
  const ingredientHtmlMatch = content.match(
    /<h3[^>]*>\s*Ingredients\s*<\/h3>\s*([\s\S]*?)(?=<h3|<h2|$)/i
  );
  if (ingredientHtmlMatch) {
    const liMatches = ingredientHtmlMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    for (const m of liMatches) {
      const item = m[1].replace(/<[^>]*>/g, "").trim();
      if (item.length > 0) ingredients.push(item);
    }
  }

  // Method 2: Plain text lines after Ingredients heading
  if (ingredients.length === 0) {
    const ingredientSection = text.match(
      /###?\s*Ingredients\s*\n([\s\S]*?)(?=###?\s*Instructions|###?\s*Directions|$)/i
    );
    if (ingredientSection) {
      ingredients = ingredientSection[1]
        .split("\n")
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter((l) => l.length > 0);
    }
  }

  // Extract instructions — try HTML ordered list first, then plain text
  let instructions: string[] = [];

  // Method 1: HTML <li> elements under Instructions/Directions heading
  const instructionHtmlMatch = content.match(
    /<h3[^>]*>\s*(?:Instructions|Directions)\s*<\/h3>\s*([\s\S]*?)(?=<h3|<h2|$)/i
  );
  if (instructionHtmlMatch) {
    const liMatches = instructionHtmlMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    for (const m of liMatches) {
      const step = m[1].replace(/<[^>]*>/g, "").trim();
      if (step.length > 0) instructions.push(step);
    }
  }

  // Method 2: Plain text numbered steps
  if (instructions.length === 0) {
    const instructionSection = text.match(
      /###?\s*(?:Instructions|Directions)\s*\n([\s\S]*?)(?=###?\s*Nutrition|###?\s*Storage|###?\s*Recipe Notes|$)/i
    );
    if (instructionSection) {
      instructions = instructionSection[1]
        .split("\n")
        .map((l) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l) => l.length > 0);
    }
  }

  // Extract nutrition — try multiple formats
  const nutritionLine = text.match(
    /Calories:\s*(\d+)\s*\|\s*Protein:\s*(\d+)g?\s*\|\s*Carbs:\s*(\d+)g?\s*\|\s*Fat:\s*(\d+)g?\s*\|\s*Fiber:\s*(\d+)g?\s*\|\s*Sugar:\s*(\d+)g?\s*\|\s*Sodium:\s*(\d+)/i
  );

  const nutritionFacts = nutritionLine
    ? {
        calories: nutritionLine[1],
        protein: nutritionLine[2],
        carbs: nutritionLine[3],
        fat: nutritionLine[4],
        fiber: nutritionLine[5],
        sugar: nutritionLine[6],
        sodium: nutritionLine[7],
      }
    : {
        calories: caloriesMatch?.[1]?.replace(/[^\d]/g, "") || "",
        protein: "",
        carbs: "",
        fat: "",
        fiber: "",
        sugar: "",
        sodium: "",
      };

  // Extract storage
  const storageSection = text.match(
    /###?\s*Storage\s*\n([\s\S]*?)(?=###?\s*Recipe Notes|$)/i
  );
  const storage = storageSection ? storageSection[1].trim() : "";

  // Extract recipe notes
  const notesSection = text.match(/###?\s*Recipe Notes\s*\n([\s\S]*?)$/i);
  const notes = notesSection
    ? notesSection[1]
        .split("\n")
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter((l) => l.length > 0)
    : [];

  // Bug Fix 7: Get recipe name directly from the heading proceeding the recipe card
  const headingMatch = content.match(/<h2[^>]*>([^<]+)<\/h2>\s*(?:<[^>]+>\s*)*?(?:<strong>|\*\*)?Prep Time/i);
  let recipeName = headingMatch ? headingMatch[1].trim() : "";
  if (!recipeName) {
    const sectionMatch = content.match(/id="recipe-card"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/i);
    if (sectionMatch) recipeName = sectionMatch[1].replace(/<[^>]*>/g, "").trim();
  }

  return {
    name: recipeName,
    description: "",
    prepTime: prepMatch?.[1]?.trim() || "",
    cookTime: cookMatch?.[1]?.trim() || "",
    totalTime: totalMatch?.[1]?.trim() || "",
    servings: servingsMatch?.[1]?.trim() || "",
    calories: caloriesMatch?.[1]?.trim() || "",
    ingredients,
    instructions,
    nutritionFacts,
    storage,
    notes,
  };
}

/**
 * Extract FAQ items from generated content
 */
export function extractFaqFromContent(
  content: string
): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];

  // Look for H3 questions followed by P answers
  const faqSection = content.match(
    /<h2[^>]*>.*?(?:FAQ|Frequently Asked).*?<\/h2>([\s\S]*?)(?=<h2|$)/i
  );

  if (faqSection) {
    const questionMatches = faqSection[1].matchAll(
      /<h3[^>]*>(.*?)<\/h3>\s*<p>([\s\S]*?)(?=<h3|$)/gi
    );
    for (const match of questionMatches) {
      faqs.push({
        question: match[1].replace(/<[^>]*>/g, "").trim(),
        answer: match[2].replace(/<[^>]*>/g, "").trim(),
      });
    }
  }

  return faqs;
}
