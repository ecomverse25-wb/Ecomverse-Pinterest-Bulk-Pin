import { useState } from "react";
import { usePrompts } from "./usePrompts";
import { PROMPT_CATEGORIES, PromptCategory } from "./prompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function PromptSettings() {
    const { prompts, updatePrompt, resetPrompt, loaded } = usePrompts();
    const [selectedCategory, setSelectedCategory] = useState<PromptCategory>('general');

    if (!loaded) return <div>Loading settings...</div>;

    // Changes are auto-saved in this version via the hook, but if we had a manual save:
    // const handleSave = () => { toast({ title: "Saved", description: "Settings updated.", variant: "success" }) }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Global Prompt Settings</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Customize the AI instructions used for generating articles. These settings are saved to your browser.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <label className="text-sm font-medium">Select Category:</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as PromptCategory)}
                            className="p-2 border rounded-md bg-transparent min-w-[200px]"
                        >
                            {PROMPT_CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">
                                Prompt Template for <span className="text-primary">{PROMPT_CATEGORIES.find(c => c.id === selectedCategory)?.label}</span>
                            </label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (confirm("Are you sure you want to reset this prompt to default?")) {
                                        resetPrompt(selectedCategory);
                                    }
                                }}
                            >
                                <RotateCcw className="w-3 h-3 mr-2" /> Reset Default
                            </Button>
                        </div>

                        <textarea
                            value={prompts[selectedCategory]}
                            onChange={(e) => updatePrompt(selectedCategory, e.target.value)}
                            className="w-full h-96 p-4 font-mono text-xs border rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary outline-none resize-y"
                            placeholder="Enter AI instructions..."
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Available placeholders: {"{title}"}, {"{itemCount}"}, {"{date}"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
