import { Metadata } from "next";
import BlogMonetizer from "@/components/blog-monetizer/BlogMonetizer";

export const metadata: Metadata = {
    title: "Blog Monetizer | PinVerse",
    description: "Create monetized blog articles with AI images, affiliate links, display ad placements, and Pinterest-ready pins.",
};

export default function BlogMonetizerPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                    Blog Monetizer 💰
                </h1>
                <p className="text-muted-foreground mt-2">
                    Create monetized blog articles with AI images, affiliate links, display ad placements, and Pinterest-ready pins.
                </p>
            </div>

            <BlogMonetizer />
        </div>
    );
}
