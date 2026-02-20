"use client";

import { useState, useEffect } from 'react';
import { DEFAULT_PROMPTS, PromptCategory } from './prompts';
import { getUserPromptsAction, savePromptAction } from '@/app/actions/user-actions';


export function usePrompts() {
    const [prompts, setPrompts] = useState<Record<PromptCategory, string>>(DEFAULT_PROMPTS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const loadPrompts = async () => {
            try {
                // 1. Try DB
                const result = await getUserPromptsAction();
                if (result.success && result.data && result.data.length > 0) {
                    const dbPrompts = result.data;
                    const merged = { ...DEFAULT_PROMPTS };
                    dbPrompts.forEach(p => {
                        if (p.category in merged) {
                            merged[p.category as PromptCategory] = p.prompt_text;
                        }
                    });
                    setPrompts(merged);
                } else {
                    // 2. Fallback to LocalStorage if DB empty/auth missing
                    const saved = localStorage.getItem('pin_lions_prompts');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        setPrompts({ ...DEFAULT_PROMPTS, ...parsed });
                    }
                }
            } catch (e) {
                console.error("Failed to load prompts", e);
            } finally {
                setLoaded(true);
            }
        };
        loadPrompts();
    }, []);

    const updatePrompt = async (category: PromptCategory, text: string) => {
        // Optimistic update
        const newPrompts = { ...prompts, [category]: text };
        setPrompts(newPrompts);

        // Save to DB (and local as backup)
        try {
            await savePromptAction(category, text);
            localStorage.setItem('pin_lions_prompts', JSON.stringify(newPrompts));
        } catch (e) {
            console.error("Failed to save prompt to DB", e);
        }
    };

    const resetPrompt = async (category: PromptCategory) => {
        const text = DEFAULT_PROMPTS[category];
        await updatePrompt(category, text);
    };

    const resetAll = async () => {
        setPrompts(DEFAULT_PROMPTS);
        localStorage.removeItem('pin_lions_prompts');
        // Loop reset all in DB? Or just rely on overwrite.
        // For now simple reset.
    };

    return { prompts, updatePrompt, resetPrompt, resetAll, loaded };
}
