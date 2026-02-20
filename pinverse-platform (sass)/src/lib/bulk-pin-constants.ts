/**
 * Shared constants for Bulk Pin Creator
 */

export const DEFAULT_TEXT_RULES = `You're a Pinterest content writer optimizing blog posts for maximum search visibility and clicks.

For this blog post URL, write:
1. A Pinterest title (under 80 characters) that starts with an emoji and includes the main keyword
2. A Pinterest description (EXACTLY 3 sentences, NO MORE) that clearly summarizes the post

CRITICAL RULES FOR DESCRIPTION:
- EXACTLY 3 sentences (not 4, not 5, just 3)
- Main keyword must appear in the first sentence
- Bold 3-4 searchable SEO keywords using **keyword** syntax (choose the most relevant ones)
- Be concise and punchy - every word must count
- Focus on benefits and what readers will learn/get
- Keywords should flow naturally, not feel forced

Blog post URL: \${url}\${interestsNote}

Format your response EXACTLY like this example:

🥗 Vegan Buddha Bowl – Clean, Colorful, and Fully Customizable

This **vegan Buddha bowl** is packed with **plant-based ingredients**, quinoa, and roasted vegetables. Perfect for **meal prep** or a quick **healthy lunch**. Customizable, colorful, and delicious!

Generate the title and description now (remember: EXACTLY 3 sentences):`;

export const DEFAULT_IMAGE_RULES = `Create a visual prompt for a high-converting, vibrant Pinterest pin.
1. IMAGE: High-quality, eye-catching, and contextually relevant
2. TYPOGRAPHY: Include the title "{title}" in a bold, readable font
3. STYLE: Creative, "Poster Style", colorful but professional.`;
