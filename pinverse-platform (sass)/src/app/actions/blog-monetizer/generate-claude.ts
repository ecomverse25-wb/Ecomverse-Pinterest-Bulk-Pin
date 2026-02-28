"use server";

export async function generateWithClaude({
    prompt,
    anthropicApiKey,
    model = "claude-sonnet-4-6",
    maxTokens = 8192,
}: {
    prompt: string;
    anthropicApiKey: string;
    model?: string;
    maxTokens?: number;
}): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            messages: [{ role: "user", content: prompt }],
        }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "Claude API error");
    return data.content[0].text;
}
