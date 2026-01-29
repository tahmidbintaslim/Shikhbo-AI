// src/lib/vectorStore.ts
import { Index } from "@upstash/vector";
import { HfInference } from "@huggingface/inference";

const index = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

const hf = new HfInference(process.env.HF_API_KEY);

export async function getContext(query: string): Promise<string> {
    try {
        // 1. Generate Embedding for the query
        // using a model good at retrieval
        const embeddingResponse = await hf.featureExtraction({
            model: "intfloat/multilingual-e5-large",
            inputs: query,
        });

        // Ensure the output is a flat array of numbers (embeddings)
        const vector = embeddingResponse as number[];

        // 2. Query Upstash Vector DB
        const results = await index.query({
            vector: vector,
            topK: 3, // Get top 3 most relevant textbook chunks
            includeMetadata: true,
        });

        // 3. Format context string
        const context = results
            .map((r) => `[Source: ${r.metadata?.source}, Chapter: ${r.metadata?.chapter}]: ${r.metadata?.text}`)
            .join("\n\n");

        return context;
    } catch (error) {
        console.error("Vector search failed, falling back to empty context:", error);
        return ""; // Fail gracefully so the chat doesn't break
    }
}