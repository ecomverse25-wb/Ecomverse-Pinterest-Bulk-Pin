export type PromptCategory = 'general' | 'home_decor' | 'fashion' | 'food';

export const PROMPT_CATEGORIES: { id: PromptCategory; label: string }[] = [
    { id: 'general', label: 'Default (General)' },
    { id: 'home_decor', label: 'Home Decor' },
    { id: 'fashion', label: 'Fashion & Outfits' },
    { id: 'food', label: 'Food & Recipes' },
];

const BASE_STRUCTURE = `
STRUCTURE:
1. Start with an engaging <h1> title that's more viral than the original:
   - Maximum 15 words
   - MUST include the exact core phrase from the original title
   - Use proper title case capitalization
   - Make it click-worthy and engaging while keeping the SEO keywords
   - Example: Original '5 Bedroom Ideas' becomes '5 Stunning Bedroom Ideas That Will Transform Your Sleep Space'

2. Follow with a short, punchy introduction (3-4 sentences) that immediately gets to the point. Hook the reader fast with why these items are amazing. No generic phrases like "In today's world..." or "In modern times...". Jump straight into something that grabs attention.

3. Create EXACTLY {itemCount} numbered sections using <h2> headings with creative names instead of boring titles.

4. For EACH section, include:
   - A brief intro paragraph (2-3 sentences) explaining why this item is awesome
   - Use <h3> subsections when helpful (like 'Key Points', 'Tips', 'Materials') but only where it makes sense
   - Include occasional <ul> lists for key elements when it helps with scannability
   - Mix short paragraphs with practical information
   - End with a brief note about benefits, applications, or when to use this

5. End with a brief, encouraging conclusion (2-3 sentences) that makes readers excited to try these ideas.

TONE & STYLE:
- Conversational and informal - write like you're chatting with a friend
- Approachable, light-hearted, and occasionally sarcastic (but don't overdo it)
- Use active voice only - avoid passive constructions entirely
- Keep paragraphs SHORT (2-3 sentences max) - make it scannable
- Use rhetorical questions to engage readers and break up text
- Sprinkle in internet slang sparingly: "FYI", "IMO", "Trust me", "Seriously" (2-3 times max per article)
- Include occasional humor to keep things fun
- Personal opinions and commentary when appropriate
- Bold key terms and important phrases with <strong> tags (but NOT in the introduction)

FORMATTING:
- Use proper HTML: <h1> for title, <h2> for numbered items, <h3> for subsections when helpful
- Use <ul> with <li> for lists of key elements
- Use <p> for paragraphs
- Break up content with vivid descriptions and specific details
- Avoid dense blocks of text
- NO Markdown, code fences, or backticks
- No extraneous preamble before content starts


TOPICAL RELEVANCE:
- Every H2 section MUST be directly relevant to the main topic: "{title}"
- Do NOT add unrelated or tangential sections
- Every section must help the reader understand or apply the main keyword topic
- Stay focused — if the topic is about a specific product category, every section should feature items from that category

Date: {date}
`;

export const DEFAULT_PROMPTS: Record<PromptCategory, string> = {
    general: `Write a conversational, friendly listicle article about: "{title}".
Target length: approximately 1500 words.

CRITICAL: Create EXACTLY {itemCount} numbered sections - no more, no less. The title specifies {itemCount} items, so deliver exactly that many.

${BASE_STRUCTURE}`,

    home_decor: `Write a conversational, friendly home decor article showcasing: "{title}".
Target length: approximately 1500 words.

CRITICAL: Present EXACTLY {itemCount} completely different and distinct room designs - no more, no less. Each section must showcase a unique, complete design concept.

${BASE_STRUCTURE.replace('3. Create EXACTLY {itemCount} numbered sections using <h2>', '3. Create EXACTLY {itemCount} numbered design sections using <h2>')
            .replace('4. For EACH section, include:', '4. For EACH design section, describe the complete room vision naturally:\n   - Start with a brief intro paragraph painting the overall picture and mood\n   - Describe specific details about colors, furniture, textiles, and decor\n   - Use <h3> subsections like "Color Palette", "Key Pieces", "Styling Tips"')}`,

    fashion: `Write a conversational, friendly fashion outfit listicle article about: "{title}".
Target length: approximately 1500 words.

CRITICAL: Create EXACTLY {itemCount} numbered outfit sections - no more, no less. The title specifies {itemCount} outfits, so deliver exactly that many.

${BASE_STRUCTURE.replace('3. Create EXACTLY {itemCount} numbered sections using <h2>', '3. Create EXACTLY {itemCount} numbered outfit sections using <h2>')
            .replace('4. For EACH section, include:', '4. For EACH outfit section, include:\n   - A brief intro paragraph explaining why this outfit is amazing\n   - <ul> list of all clothing items and accessories\n   - <p> styling tips on how to wear and accessorize')}`,

    food: `Write a conversational, friendly food recipe article about: "{title}".
Target length: approximately 1500 words.

CRITICAL: Create EXACTLY {itemCount} numbered recipe sections - no more, no less. The title specifies {itemCount} recipes, so deliver exactly that many.

${BASE_STRUCTURE.replace('3. Create EXACTLY {itemCount} numbered sections using <h2>', '3. Create EXACTLY {itemCount} numbered recipe sections using <h2>')
            .replace('4. For EACH section, include:', '4. For EACH recipe section, include:\n   - A brief intro paragraph explaining why this recipe is awesome\n   - <h3>Ingredients:</h3> section with bulleted <ul> list\n   - <h3>Instructions:</h3> section with numbered <ol> steps')}`
};
