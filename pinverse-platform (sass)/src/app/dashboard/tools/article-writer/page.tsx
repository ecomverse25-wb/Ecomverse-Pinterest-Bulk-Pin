import { Metadata } from "next";
import ArticleWriterTool from "@/components/article-writer/ArticleWriterTool";

export const metadata: Metadata = {
    title: "PinVerse Master Writer | PinVerse",
    description: "AI-powered SEO Article & Pin Generator",
};

export default function ArticleWriterPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                    PinVerse Master Writer
                </h1>
                <p className="text-muted-foreground mt-2">
                    Turn keywords into SEO articles and Pinterest assets in 3 simple steps.
                </p>
            </div>

            <ArticleWriterTool />
        </div>
    );
}
