import { Metadata } from "next";
import FoodSeoWriter from "@/components/food-seo-writer/FoodSeoWriter";

export const metadata: Metadata = {
    title: "Food SEO Writer | PinVerse",
    description: "Create food blog content that ranks on Google AND gets saved on Pinterest. Built on pillar/cluster SEO architecture with Rank Math 80+ targeting.",
};

export default function FoodSeoWriterPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                    Food SEO Writer 🍳
                </h1>
                <p className="text-muted-foreground mt-2">
                    Create food blog content that ranks on Google AND gets saved on Pinterest. Built on pillar/cluster SEO architecture with Rank Math 80+ targeting.
                </p>
            </div>

            <FoodSeoWriter />
        </div>
    );
}
