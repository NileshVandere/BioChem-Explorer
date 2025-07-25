
import { GoogleGenAI, Type } from "@google/genai";
import { Paper, Source } from "../types";

// Ensure the API key is available, but do not hardcode it.
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the schema for a single paper object
const paperSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Title of the paper" },
        authors: { 
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of authors"
        },
        year: { type: Type.INTEGER, description: "Year of publication" },
        abstract: { type: Type.STRING, description: "A short, one or two sentence abstract of the paper." }
    },
    required: ["title", "authors", "year", "abstract"]
};

// Define the overall schema for the API response
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise, one-paragraph summary of the current research on the topic."
        },
        papers: {
            type: Type.ARRAY,
            description: "An array of up to 5 relevant academic papers.",
            items: paperSchema
        }
    },
    required: ["summary", "papers"]
};

export const searchAcademicPapers = async (query: string): Promise<{ summary: string; papers: Paper[]; sources: Source[] }> => {
    if (!query) {
        return { summary: '', papers: [], sources: [] };
    }

    const prompt = `
You are a helpful biochemistry research assistant. Based on the query "${query}", find relevant academic papers and generate a summary.
Provide a concise, one-paragraph summary of the current research on the topic, and a list of up to 5 relevant academic papers.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const sources: Source[] = groundingMetadata?.groundingChunks
            ?.map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string } => !!web?.uri) || [];
        
        const responseText = response.text.trim();
        const parsedJson = JSON.parse(responseText);

        // We shape the data from the API to our internal `Paper` type
        const papers: Paper[] = parsedJson.papers.map((p: any) => ({
            ...p,
            id: `${p.title.slice(0, 20)}-${p.year}`, // Create a simple unique ID
            tags: [], // Initialize with empty tags
            year: p.year || null // Ensure year can be null if not provided
        }));

        return { summary: parsedJson.summary, papers, sources };

    } catch (error) {
        console.error("Error fetching or parsing from Gemini API:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to parse the data from the AI service. The format was invalid.");
        }
        throw new Error("Failed to fetch data from the AI service. Please check your connection and API key.");
    }
};
