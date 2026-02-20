import { WPCredentials, ArticleData } from "@/components/article-writer/types";

interface WPPostResponse {
    id: number;
    link: string;
    title: { rendered: string };
    content: { rendered: string };
    status: string;
    [key: string]: unknown;

}

export class WPService {
    private url: string;
    private authHeader: string;

    constructor(creds: WPCredentials) {
        this.url = creds.url.replace(/\/$/, ""); // Remove trailing slash
        // Basic Auth for WordPress Application Passwords
        this.authHeader = `Basic ${btoa(`${creds.user}:${creds.password}`)}`;
    }

    /**
     * Create a new post in WordPress
     */
    async createPost(article: ArticleData): Promise<WPPostResponse> {
        const endpoint = `${this.url}/wp-json/wp/v2/posts`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authHeader
                },
                body: JSON.stringify({
                    title: article.title,
                    content: article.content,
                    status: 'draft', // Always draft for safety
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `WordPress Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: unknown) {

            console.error("WP Create Post Error:", error);
            throw error;
        }
    }

    /**
     * Validate connection by checking the user endpoint
     */
    async validateConnection(): Promise<boolean> {
        const endpoint = `${this.url}/wp-json/wp/v2/users/me`;
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': this.authHeader
                }
            });
            return response.status === 200;
        } catch {

            return false;
        }
    }
}
