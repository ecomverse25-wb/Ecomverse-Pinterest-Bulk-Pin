// ─── Food SEO Writer v2.0 — 7 Content Templates (Section 2.3) ───

import type { ContentType } from "../types";

export interface ContentTemplate {
  type: ContentType;
  structure: string;
  rules: string[];
  bestFor: string;
  promptInstructions: string;
}

export const CONTENT_TEMPLATES: Record<ContentType, ContentTemplate> = {
  "auto-detect": {
    type: "auto-detect",
    structure: "AI will automatically detect the best content structure based on the keyword intent.",
    rules: ["AI determines the best rules to follow based on detected content type."],
    bestFor: "Keywords where the search intent is mixed or you are unsure what template to use.",
    promptInstructions: "Auto-detect",
  },
  "Single Recipe Post": {
    type: "Single Recipe Post",
    structure:
      "Hook (2-3 sentences) → Personal story/why this recipe (150-300 words) → Key tips section (H2) → Recipe card (full structured recipe) → FAQ section (5-7 Q&As) → Related recipes links",
    rules: [
      "Must include a full recipe card with exact ingredients, measurements, numbered instructions, prep/cook/total time, servings, calories",
      "Personal story section must be 100-200 words MAX — not 500-word life stories",
      "Include a 'Jump to Recipe' anchor link after the intro",
      "Recipe card must follow the exact format: name, description, prep time, cook time, total time, servings, calories, ingredients (with measurements), numbered instructions, nutrition facts, storage tips, variations",
    ],
    bestFor: "Individual recipe targeting specific long-tail keywords",
    promptInstructions: `TEMPLATE: SINGLE RECIPE POST

Structure your article EXACTLY as follows:
1. HOOK: 2-3 sentences introducing the dish, include main keyword naturally
2. PERSONAL STORY: 150-300 words about WHY this recipe matters — keep it short, no 500-word life stories
3. KEY TIPS SECTION (H2): Expert tips for making this recipe perfectly
4. RECIPE CARD SECTION: Full structured recipe with:
   - Recipe name
   - Description (1-2 sentences)
   - **Prep Time:** [X minutes]
   - **Cook Time:** [X minutes]
   - **Total Time:** [X minutes]
   - **Servings:** [X]
   - **Calories:** [X per serving]
   ### Ingredients
   - [Measurement] [Ingredient] ([preparation note if needed])
   ### Instructions
   1. [Specific instruction with temperature, time, and visual cue]
   2. [Continue numbered steps with "you'll know it's ready when..." visual indicators]
   ### Nutrition Facts (per serving)
   Calories: [X] | Protein: [X]g | Carbs: [X]g | Fat: [X]g | Fiber: [X]g | Sugar: [X]g | Sodium: [X]mg
   ### Storage
   [How to store, how long it lasts, reheating instructions]
   ### Recipe Notes
   - [Substitution options]
   - [Make-ahead tips]
   - [Scaling notes]
5. FAQ SECTION: 5-7 Q&As with concise 50-100 word answers
6. RELATED RECIPES: Links to 3-5 related recipe posts
7. CONCLUSION: 2-3 sentences with call-to-action`,
  },

  "Recipe Roundup/Listicle": {
    type: "Recipe Roundup/Listicle",
    structure:
      "Hook → Brief intro (100-200 words) → N items (each with: H2 title, image placeholder, 80-150 word preview description, 'Get the Full Recipe' link, one practical tip) → FAQ section → Conclusion with CTA",
    rules: [
      "CRITICAL RULE: Roundups must NOT include full recipes inline. Each item is a preview only, linking to individual recipe posts. This maximizes ad revenue per page (per Tony Hill's playbook).",
      "Each item gets exactly: H2 title, image placeholder, 80-150 word preview description, 'Get the Full Recipe' link, one practical tip",
      "Roundup should have 10-25 items for best Pinterest performance",
      "If user selects roundup with only 1-3 items, suggest switching to Single Recipe Post",
      "NO full ingredient lists, NO full instruction lists inline",
    ],
    bestFor: "High-volume Pinterest traffic, '25 Best...' type posts",
    promptInstructions: `TEMPLATE: RECIPE ROUNDUP / LISTICLE

CRITICAL RULE: This is a ROUNDUP post. You must NOT include full recipes inline.
Each recipe item gets ONLY:
- H2 title with the recipe name
- Image placeholder
- 80-150 word preview description highlighting what makes this recipe special
- One practical tip (e.g., "Pro tip: Use day-old rice for the best texture")
- A "Get the Full Recipe →" link placeholder

DO NOT include:
- Full ingredient lists
- Full numbered instruction steps
- Prep/cook times per item (save for the individual recipe page)

Structure:
1. HOOK: 2-3 sentences, include main keyword
2. BRIEF INTRO: 100-200 words about the theme
3. RECIPE ITEMS: 15-25 items, each as described above
4. FAQ SECTION: 5-7 Q&As
5. CONCLUSION: 2-3 sentences with "Save this for later!" CTA`,
  },

  "Meal Prep Guide": {
    type: "Meal Prep Guide",
    structure:
      "Hook → Why this meal prep works → Shopping list (organized by store section) → Day-by-day prep schedule → Storage & reheating instructions → Recipe cards for each meal → FAQ",
    rules: [
      "Shopping list must be organized by store section (produce, dairy, protein, pantry)",
      "Include a day-by-day prep schedule with time estimates",
      "Each meal gets a full recipe card with ingredients and instructions",
      "Storage and reheating instructions are mandatory",
    ],
    bestFor: "'Meal prep' keywords, appeals to organized/busy audience",
    promptInstructions: `TEMPLATE: MEAL PREP GUIDE

Structure your article EXACTLY as follows:
1. HOOK: 2-3 sentences about making weeknights easier
2. WHY THIS MEAL PREP WORKS: Benefits, time savings, cost savings
3. SHOPPING LIST (H2): Organized by store section:
   - Produce section
   - Dairy & Eggs section
   - Protein section
   - Pantry Staples section
4. DAY-BY-DAY PREP SCHEDULE (H2): Step-by-step with time estimates per day
5. STORAGE & REHEATING (H2): How long each meal lasts, best reheating methods
6. RECIPE CARDS: Full recipe card for each meal in the prep plan
7. FAQ SECTION: 5-7 Q&As about meal prep
8. CONCLUSION: Encouragement and Pinterest save CTA`,
  },

  "Product Review": {
    type: "Product Review",
    structure:
      "Hook → Product overview → Testing methodology → Pros/Cons → Performance ratings → Who should buy → Alternatives → Verdict → FAQ",
    rules: [
      "Must include specific testing methodology (how you used/tested the product)",
      "Pros/Cons must be in list format",
      "Performance ratings should use a clear scale (e.g., X/10)",
      "Include 'Who should buy' and 'Who should skip' sections",
      "Affiliate links must use rel='sponsored noopener noreferrer'",
    ],
    bestFor: "Kitchen tools, gadgets, affiliate conversion content",
    promptInstructions: `TEMPLATE: PRODUCT REVIEW

Structure your article EXACTLY as follows:
1. HOOK: 2-3 sentences with a verdict teaser
2. PRODUCT OVERVIEW (H2): What it is, key features, price range
3. TESTING METHODOLOGY (H2): How you personally tested it, duration, specific usage scenarios
4. PROS & CONS (H2): Clear bulleted lists
5. PERFORMANCE RATINGS (H2): Rate categories 1-10 (Build Quality, Ease of Use, Value for Money, Performance)
6. WHO SHOULD BUY (H2): Specific user profiles this product suits
7. ALTERNATIVES (H2): 2-3 competing products with brief comparisons
8. FINAL VERDICT (H2): Summary recommendation
9. FAQ SECTION: 5-7 Q&As about the product
10. CONCLUSION: Final recommendation with CTA`,
  },

  "Comparison Post": {
    type: "Comparison Post",
    structure:
      "Hook → Quick comparison table → Detailed comparison by category → Use case recommendations → Winner verdict → FAQ",
    rules: [
      "Must include a comparison table at the top",
      "Compare at least 4-5 categories (features, price, durability, ease of use, value)",
      "Include specific 'Use case recommendations' (best for X, best for Y)",
      "End with a clear winner verdict",
    ],
    bestFor: "'X vs Y' keywords, high commercial intent",
    promptInstructions: `TEMPLATE: COMPARISON POST

Structure your article EXACTLY as follows:
1. HOOK: 2-3 sentences framing the comparison
2. QUICK COMPARISON TABLE (H2): Side-by-side table of key specs/features
3. DETAILED COMPARISON BY CATEGORY: Each category as an H2:
   - Features & Functionality
   - Price & Value
   - Build Quality & Durability
   - Ease of Use
   - Performance
4. USE CASE RECOMMENDATIONS (H2): "Best for..." specific scenarios
5. WINNER VERDICT (H2): Clear recommendation with reasoning
6. FAQ SECTION: 5-7 Q&As
7. CONCLUSION: Summary and CTA`,
  },

  "Holiday/Seasonal": {
    type: "Holiday/Seasonal",
    structure:
      "Hook with seasonal urgency → Why these recipes are perfect for [season] → Recipe roundup (8-15 items) → Planning timeline → Shopping list → FAQ",
    rules: [
      "Must include seasonal urgency in the hook",
      "Roundup section follows the same CRITICAL RULE as Recipe Roundup: NO full recipes inline, preview only",
      "Include a planning timeline for the holiday/event",
      "Include a consolidated shopping list",
      "TIMING RULE: If current month is Jan-Feb, suggest spring/Easter. Mar-Apr, suggest summer/BBQ. May-Jul, suggest fall/Thanksgiving. Aug-Oct, suggest winter/holiday baking. Nov-Dec, suggest New Year/winter comfort food.",
    ],
    bestFor: "Seasonal Pinterest traffic spikes",
    promptInstructions: `TEMPLATE: HOLIDAY / SEASONAL

Structure your article EXACTLY as follows:
1. HOOK: 2-3 sentences with seasonal urgency ("The holidays are just around the corner...")
2. WHY THESE RECIPES (H2): Why these are perfect for the season/holiday
3. RECIPE ROUNDUP: 8-15 recipe items, each with:
   - H2 title
   - Image placeholder
   - 80-150 word preview description
   - "Get the Full Recipe →" link
   - One seasonal tip
   NOTE: Do NOT include full recipes inline. Previews only.
4. PLANNING TIMELINE (H2): When to start prepping (4 weeks out, 2 weeks out, day before, day of)
5. MASTER SHOPPING LIST (H2): Organized by store section
6. FAQ SECTION: 5-7 Q&As
7. CONCLUSION: Seasonal warmth and Pinterest save CTA`,
  },

  "Pillar Page": {
    type: "Pillar Page",
    structure:
      "Comprehensive H1 → Table of contents → 8-12 H2 sections covering subtopics → Each section links to cluster posts → FAQ → Resource section",
    rules: [
      "Must include a table of contents at the top",
      "8-12 H2 sections, each covering a distinct subtopic",
      "Each section must link to a related cluster post",
      "Include a resource section at the end",
      "This is the hub page — each H2 should be a gateway to deeper content",
      "Word count should be 3000-4500 words (comprehensive)",
    ],
    bestFor: "Category hub pages (e.g., 'Healthy Recipes' pillar linking to all healthy recipe posts)",
    promptInstructions: `TEMPLATE: PILLAR PAGE

Structure your article EXACTLY as follows:
1. COMPREHENSIVE H1: Broad topic title with main keyword
2. TABLE OF CONTENTS: Linked list of all H2 sections
3. INTRODUCTION: 200-300 words establishing authority on the topic
4. H2 SECTIONS (8-12 total): Each covering a distinct subtopic:
   - 200-300 words per section
   - Link to a related cluster content page: "[Read more: Full Guide to X]"
   - Cover the subtopic well enough to stand alone but encourage clicking deeper
5. FAQ SECTION: 5-7 Q&As covering the broadest questions
6. RESOURCE SECTION (H2): Links to tools, books, websites related to the topic
7. CONCLUSION: Comprehensive summary and CTA to explore cluster pages`,
  },
};

/**
 * Get the appropriate content template for a given content type
 */
export function getTemplate(contentType: ContentType): ContentTemplate {
  return CONTENT_TEMPLATES[contentType];
}

/**
 * Get template prompt instructions for the AI generation stage
 */
export function getTemplateInstructions(contentType: ContentType): string {
  return CONTENT_TEMPLATES[contentType].promptInstructions;
}
