/**
 * Pinterest Pin Templates Library
 * 21 system templates for bulk pin generation + user custom templates
 */

export interface PinTemplate {
    id: string;
    name: string;
    isSystem: boolean;
    guidelines: string;
}

export const PIN_TEMPLATES: PinTemplate[] = [
    {
        id: "basic-text-top",
        name: "Basic – Text at Top",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description with TEXT AT THE TOP:\n\nThis Pinterest pin is viral. [Brief visual description of the main image]. Text Overlay at the top: "[KEY PHRASE]" in bold white font on a [vibrant color like coral, teal, navy, burgundy, etc.] semi-transparent background strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- KEEP IT SHORT - 2-3 sentences MAX describing ONLY visual elements\n- Text MUST be positioned at the TOP of the pin\n- Text sits on a COLORED semi-transparent overlay strip (vary colors: coral, teal, navy, burgundy, mustard, sage, etc.)\n- Text Overlay phrase: 2-6 words max\n- ALWAYS preserve numbers from listicles (e.g., "7 Healthy Salads", "10 Tips")\n- DO NOT include special characters in text overlay (NO ! . , ? : ; etc.) - ONLY letters and numbers\n- Extract the FULL DESCRIPTIVE topic from URL\n- DO NOT add marketing language like "Discover", "Learn", "Unlock"\n- You MUST include the Text Overlay section with phrase in quotes, no other symbols\n- You MUST end with "This Pinterest pin is [tone word] and highly clickable."\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "basic-text-middle",
        name: "Basic – Text at Middle",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description using this EXACT format:\n\nThis Pinterest pin is viral. [Brief visual description of the scene]. Text Overlay: "[KEY PHRASE]" in bold white modern font with [color] outline. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- KEEP IT SHORT - 2-3 sentences MAX describing ONLY visual elements\n- Text Overlay phrase: 2-6 words max, descriptive but concise\n- ALWAYS preserve numbers from listicles (e.g., "7 Healthy Salads", "10 Baking Tips")\n- DO NOT include special characters in text overlay (NO ! . , ? : ; etc.) - ONLY letters and numbers\n- Extract the FULL DESCRIPTIVE topic from URL, not just generic words\n- DO NOT add marketing language like "Discover", "Learn", "Unlock"\n- You MUST include the Text Overlay section with phrase in quotes, no other symbols\n- You MUST end with "This Pinterest pin is [tone word] and highly clickable."\n- The entire response must be ONE complete paragraph\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else. Make sure to complete the entire sentence.`,
    },
    {
        id: "basic-text-bottom",
        name: "Basic – Text at Bottom",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description with TEXT AT THE BOTTOM:\n\nThis Pinterest pin is viral. [Brief visual description of the main image]. Text Overlay at the bottom: "[KEY PHRASE]" in bold white font on a [vibrant color like coral, teal, navy, burgundy, etc.] semi-transparent background strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- KEEP IT SHORT - 2-3 sentences MAX describing ONLY visual elements\n- Text MUST be positioned at the BOTTOM of the pin\n- Text sits on a COLORED semi-transparent overlay strip (vary colors: coral, teal, navy, burgundy, mustard, sage, etc.)\n- Text Overlay phrase: 2-6 words max\n- ALWAYS preserve numbers from listicles\n- DO NOT include special characters in text overlay - ONLY letters and numbers\n- Extract the FULL DESCRIPTIVE topic from URL\n- DO NOT add marketing language\n- You MUST end with "This Pinterest pin is [tone word] and highly clickable."\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "closeup-food-subject-text",
        name: "Closeup – Food/Subject + Text",
        isSystem: true,
        guidelines: `Create a Pinterest pin description based on the blog post.\n\nThe text overlay should clearly state what the dish is, using only the name (no extra words or adjectives).\n\nFormat:\nCloseup of the X. Text Overlay in the center: "[TITLE]" in bold white modern font on a pastel strip. This Pinterest pin is [tone] and highly clickable.\n\nRULES:\n- X: describe the closeup subject from the URL\n- TITLE: just the dish name, nothing else\n- tone: cozy, fresh, inviting, delicious, irresistible, etc.\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "home-decor-detail-showcase",
        name: "Home Decor – Detail Showcase",
        isSystem: true,
        guidelines: `Create a Pinterest pin description based on the blog post.\n\nFormat:\nA styled detail shot of X, showcasing Y. Text Overlay in the center: "[TITLE]" in bold white modern font on a pastel strip. This Pinterest pin is [tone] and highly clickable.\n\nRULES:\n- X: describe the specific decor element from the URL (e.g., "a rattan shelf with dried pampas grass and candles")\n- Y: the key design detail (e.g., "layered textures and neutral tones")\n- TITLE: just the decor idea name, nothing else (e.g., "Cozy Shelf Styling")\n- tone: cozy, elegant, inviting, minimal, warm, serene, etc.\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "mirror-selfie-outfit-idea",
        name: "Mirror Selfie – Outfit Idea",
        isSystem: true,
        guidelines: `Create a Pinterest pin description based on the blog post.\n\nIf it's a listicle, include the number in the text overlay (e.g., "12 Fall Outfit Ideas").\n\nFormat:\nA mirror selfie of a woman wearing X, showcasing Y. Text Overlay in the center: "TITLE" in bold white modern font on a pastel strip. This Pinterest pin is TONE and highly clickable.\n\nRULES:\n- X: describe the outfit from the URL (e.g., "a cream knit sweater with high-waisted jeans and ankle boots")\n- Y: the style detail (e.g., "casual layering for fall")\n- TITLE: just the outfit idea name, nothing else\n- TONE: chic, trendy, effortless, stylish, cute, aesthetic, etc.\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "dual-image-2-photos-text-banner",
        name: "Dual Image – 2 Photos + Text Banner",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a DUAL-IMAGE PIN (2 images + text in middle):\n\nA vertical pin design divided into three sections. Top section: high-quality close-up photograph with professional lighting. Middle section: solid color horizontal banner with bold typography headline. Bottom section: second close-up of the same subject from a different angle.\n\nCRITICAL RULES:\n- Text Overlay phrase: 2-6 words max, no special characters, ONLY letters and numbers\n- ALWAYS preserve numbers from listicles\n- You MUST start with "This Pinterest pin is viral."\n- You MUST end with "This Pinterest pin is [tone word] and highly clickable."\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "collage-multiple-images",
        name: "Collage – Multiple Images",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a COLLAGE-STYLE pin:\n\nThis Pinterest pin is viral. [Brief description of collage layout with 2-4 images showing the topic]. Text Overlay: "[KEY PHRASE]" in bold white modern font with [color] outline centered in the middle of the pin. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- 2-3 sentences MAX, ONE complete paragraph\n- Collage: 2, 3, or 4 images in grid, diagonal split, or mosaic layout\n- Text Overlay phrase: 2-6 words max, no special characters\n- ALWAYS preserve numbers from listicles\n- DO NOT add marketing language\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "recipe-step-by-step",
        name: "Recipe – Step by Step",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a RECIPE pin:\n\nThis Pinterest pin is viral. [Describe a top-down or angled shot of the finished dish with ingredients arranged naturally around it, warm professional food photography lighting]. Text Overlay at the top: "[RECIPE NAME]" in bold white font on a warm-toned semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- Beautiful food photography: flat lay or 45-degree angle\n- Recipe name as text overlay: 2-5 words, no special characters\n- ALWAYS preserve numbers from listicles\n- Tone words: delicious, mouthwatering, cozy, irresistible, comforting, fresh\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "fitness-workout-action",
        name: "Fitness – Workout Action Shot",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a FITNESS pin:\n\nThis Pinterest pin is viral. [Describe a dynamic action shot of someone performing the workout from the URL, gym or home setting, strong lighting, motivational energy]. Text Overlay at the top: "[WORKOUT NAME]" in bold white font on a dark semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- High-energy fitness scene showing the movement clearly\n- ALWAYS preserve numbers (e.g., "10 Minute Ab Workout", "30 Day Challenge")\n- Text Overlay: workout type only, 2-5 words, no special characters\n- Tone words: motivating, energetic, powerful, strong, empowering\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "travel-destination-wanderlust",
        name: "Travel – Destination Wanderlust",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a TRAVEL DESTINATION pin:\n\nThis Pinterest pin is viral. [Describe a breathtaking wide-angle or golden-hour shot of the destination, capturing its most iconic scenic element]. Text Overlay at the bottom: "[DESTINATION NAME]" in bold white font on a deep-toned semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- Cinematic, wanderlust-inspiring photography (golden hour, blue hour, or dramatic light)\n- ALWAYS preserve numbers (e.g., "7 Days in Bali", "10 Hidden Gems")\n- Text Overlay: destination or trip type, 2-5 words, no special characters\n- Tone words: wanderlust, dreamy, breathtaking, inspiring, adventurous, serene\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "travel-itinerary-guide",
        name: "Travel – Itinerary Guide",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a TRAVEL ITINERARY pin:\n\nThis Pinterest pin is viral. [Describe a grid collage of 3 iconic spots from the destination: one landmark, one food scene, one nature or street shot]. Text Overlay in the center: "[ITINERARY TITLE]" in bold white modern font on a dark semi-transparent banner. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- ALWAYS preserve numbers (e.g., "5 Days in Tokyo")\n- Text Overlay: trip title only, 2-5 words, no special characters\n- Tone words: adventurous, inspiring, practical, wanderlust, exciting\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "beauty-product-flatlay",
        name: "Beauty – Product Flat Lay",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a BEAUTY PRODUCT FLAT LAY pin:\n\nThis Pinterest pin is viral. [Describe an elegant top-down flat lay of beauty or skincare products on a marble or linen surface, soft natural light, products arranged with minimal props like florals or crystals]. Text Overlay in the center: "[PRODUCT OR ROUTINE NAME]" in bold white modern font on a pastel semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- ALWAYS preserve numbers (e.g., "5 Step Skincare Routine")\n- Text Overlay: product or routine name only, 2-5 words, no special characters\n- Tone words: luxurious, glowy, clean, minimal, chic, aesthetic, soft\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "beauty-makeup-tutorial",
        name: "Beauty – Makeup Tutorial",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a MAKEUP TUTORIAL pin:\n\nThis Pinterest pin is viral. [Describe a close-up portrait of a woman with flawless makeup matching the look from the URL, soft studio lighting, clean background]. Text Overlay at the top: "[LOOK NAME]" in bold white font on a rose or mauve semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- Specify the exact makeup look from the URL (e.g., smoky eye, no-makeup makeup, bold lip)\n- ALWAYS preserve numbers (e.g., "5 Minute Makeup")\n- Text Overlay: look name only, 2-5 words, no special characters\n- Tone words: glam, effortless, flawless, stunning, radiant, chic\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "diy-craft-tutorial",
        name: "DIY – Craft Tutorial",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a DIY CRAFT pin:\n\nThis Pinterest pin is viral. [Describe the finished DIY project as the hero on a clean workspace, craft materials artfully arranged around it, warm natural light]. Text Overlay at the top: "[PROJECT NAME]" in bold white font on a craft-toned (sage, terracotta, or mustard) semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- ALWAYS preserve numbers (e.g., "10 Easy DIY Projects")\n- Text Overlay: project name only, 2-5 words, no special characters\n- Tone words: creative, fun, satisfying, inspiring, budget-friendly, handmade\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "parenting-lifestyle",
        name: "Parenting – Lifestyle Moment",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a PARENTING LIFESTYLE pin:\n\nThis Pinterest pin is viral. [Describe a warm candid lifestyle photo of a parent and child in a cozy home setting, natural light, genuine moment matching the topic from the URL]. Text Overlay at the top: "[TIP OR TOPIC NAME]" in bold white font on a soft warm-toned semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- ALWAYS preserve numbers (e.g., "15 Toddler Activities")\n- Text Overlay: tip or topic name only, 2-5 words, no special characters\n- Tone words: heartwarming, helpful, relatable, comforting, real, encouraging\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "finance-tips-infographic",
        name: "Finance – Tips Infographic Style",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a FINANCE pin:\n\nThis Pinterest pin is viral. [Describe a clean modern infographic-style pin with a bold number or stat as the hero element, minimal icons, professional color palette of navy and gold or green and white]. Text Overlay: "[TIP COUNT OR KEY STAT]" as the dominant visual element in bold modern font. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- Lead with the most impactful number or stat from the URL\n- ALWAYS preserve numbers (e.g., "7 Ways to Save", "Save 1000")\n- Text Overlay: key number or short phrase, 2-5 words, no special characters\n- Tone words: practical, empowering, actionable, smart, motivating, eye-opening\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "wedding-inspiration-mood",
        name: "Wedding – Inspiration Mood Board",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a WEDDING INSPIRATION pin:\n\nThis Pinterest pin is viral. [Describe a romantic editorial-style photo featuring the key wedding element from the URL — florals, tablescape, dress detail, or venue — in soft natural light with a dreamy aesthetic]. Text Overlay at the bottom: "[WEDDING ELEMENT NAME]" in elegant white serif font on a blush or champagne semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- ALWAYS preserve numbers (e.g., "50 Wedding Centerpiece Ideas")\n- Text Overlay: element name only, 2-5 words, no special characters\n- Tone words: romantic, dreamy, elegant, timeless, stunning, ethereal\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "gardening-outdoor-living",
        name: "Gardening – Outdoor Living",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a GARDENING pin:\n\nThis Pinterest pin is viral. [Describe a lush vibrant garden or outdoor space in golden morning light, showing the specific plants, flowers, or setup from the URL]. Text Overlay at the top: "[GARDEN TOPIC]" in bold white font on a sage or earthy green semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- ALWAYS preserve numbers (e.g., "20 Raised Bed Ideas")\n- Text Overlay: garden topic only, 2-5 words, no special characters\n- Tone words: lush, peaceful, earthy, fresh, serene, vibrant, natural\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "pets-cute-moment",
        name: "Pets – Cute Moment",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a PETS pin:\n\nThis Pinterest pin is viral. [Describe an adorable high-quality close-up of the pet from the URL — dog, cat, or other animal — with soft natural light, clean background, and sharp focus on the eyes]. Text Overlay at the top: "[PET TOPIC]" in bold white font on a warm-toned semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- Professional pet photography style: sharp eyes, soft bokeh background\n- ALWAYS preserve numbers (e.g., "10 Dog Training Tips")\n- Text Overlay: pet topic only, 2-5 words, no special characters\n- Tone words: adorable, heartwarming, cute, sweet, fun, lovable\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "productivity-workspace",
        name: "Productivity – Workspace Aesthetic",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a PRODUCTIVITY pin:\n\nThis Pinterest pin is viral. [Describe a beautifully styled desk flat lay with laptop, notebook, coffee, and minimal decor in a neutral or dark academia aesthetic, clean natural light]. Text Overlay at the top: "[PRODUCTIVITY TOPIC]" in bold white font on a charcoal or navy semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- Aspirational workspace: minimal Scandinavian, dark academia, or clean modern style\n- ALWAYS preserve numbers (e.g., "10 Morning Routine Tips")\n- Text Overlay: topic only, 2-5 words, no special characters\n- Tone words: focused, motivating, aesthetic, organized, clean, inspiring\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
    {
        id: "kids-activities-crafts",
        name: "Kids – Activities and Crafts",
        isSystem: true,
        guidelines: `You will be given a blog post URL. Generate a single Pinterest pin description for a KIDS ACTIVITIES pin:\n\nThis Pinterest pin is viral. [Describe a bright colorful photo of children doing the activity from the URL — crafts, sensory play, or outdoor fun — with vibrant materials and genuine happy expressions, natural light]. Text Overlay at the top: "[ACTIVITY NAME]" in bold white font on a bright playful-colored (coral, teal, or yellow) semi-transparent strip. This Pinterest pin is [tone word] and highly clickable.\n\nCRITICAL RULES:\n- Bright joyful scene that parents find instantly appealing\n- ALWAYS preserve numbers (e.g., "20 Rainy Day Activities")\n- Text Overlay: activity name only, 2-5 words, no special characters\n- Tone words: fun, creative, educational, easy, engaging, colorful, joyful\n\nBlog post URL: \${url}\nReturn ONLY the Pinterest pin description, nothing else.`,
    },
];

/** System templates only (isSystem: true) */
export const SYSTEM_PIN_TEMPLATES = PIN_TEMPLATES.filter(t => t.isSystem);

/** Get a template by its ID */
export function getTemplateById(id: string): PinTemplate | undefined {
    return PIN_TEMPLATES.find(t => t.id === id);
}

// Keep backward compatibility alias
export function getTemplateBySlug(slug: string): PinTemplate | undefined {
    return getTemplateById(slug);
}

/**
 * Merge system templates with user custom templates.
 * If a user template has the same ID as a system template, keep the user's version.
 */
export function mergeTemplates(userTemplates: PinTemplate[]): PinTemplate[] {
    const userIds = new Set(userTemplates.map(t => t.id));
    const systemOnes = SYSTEM_PIN_TEMPLATES.filter(t => !userIds.has(t.id));
    return [...systemOnes, ...userTemplates];
}

// Legacy exports kept for backward compatibility
export function getTemplatesByNiche(_niche: string): PinTemplate[] {
    return PIN_TEMPLATES;
}

export function getAllNiches(): string[] {
    return ['all'];
}

export const NICHE_LABELS: Record<string, string> = {
    all: 'All Templates',
};

export function processPromptTemplate(
    template: string,
    keywords: string,
    niche: string
): string {
    return template
        .replace(/\{\{keywords\}\}/g, keywords)
        .replace(/\{\{niche\}\}/g, NICHE_LABELS[niche] || niche)
        .trim();
}

export function generateSEOSlug(keywords: string): string {
    return keywords
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
}
