import { GoogleGenAI, Type } from "@google/genai";
import { WordItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWordsWithGemini = async (topic: string, count: number = 20): Promise<WordItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a list of ${count} diverse English vocabulary words related to the topic "${topic}". 
      Include the part of speech (POS) and the Traditional Chinese meaning.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The English vocabulary word" },
              pos: { type: Type.STRING, description: "Part of speech (e.g., n., v., adj.)" },
              meaning: { type: Type.STRING, description: "Traditional Chinese meaning" }
            },
            required: ["word", "pos", "meaning"]
          }
        }
      }
    });

    const jsonStr = response.text || "[]";
    const data = JSON.parse(jsonStr) as WordItem[];
    return data;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};