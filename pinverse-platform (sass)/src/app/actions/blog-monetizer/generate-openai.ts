"use server";

export async function generateWithOpenAI({
    prompt,
    openaiApiKey,
    model = "gpt-5.2-instant",
    maxTokens = 8192,
}: {
    prompt: string;
    openaiApiKey: string;
    model?: string;
    maxTokens?: number;
}): Promise<string> {
    const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                max_tokens: maxTokens,
                messages: [{ role: "user", content: prompt }],
            }),
        }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "OpenAI API error");
    return data.choices[0].message.content;
}
