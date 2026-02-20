"use server";

import { ArticleData, WPCredentials } from "@/components/article-writer/types";

// Server Action for WordPress Publishing
// This avoids CORS issues and hides credentials from the client network (though they are still passed from client state currently).

export async function publishPostAction(article: ArticleData, credentials: WPCredentials) {
    if (!credentials.url || !credentials.user || !credentials.password) {
        return { error: "Missing WordPress credentials." };
    }

    try {
        const auth = btoa(`${credentials.user}:${credentials.password}`);
        const wpUrl = credentials.url.replace(/\/$/, ""); // Remove trailing slash

        const postData = {
            title: article.title,
            content: article.content,
            status: 'draft', // Always draft for safety
            // Optional: categories, tags, author, etc.
        };

        const response = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WordPress API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return { success: true, link: data.link, id: data.id };

    } catch (error: any) {
        console.error("WP Action Error:", error);
        const msg = error instanceof Error ? error.message : "Failed to publish post.";
        return { error: msg };
    }
}
