import { GoogleGenAI, Type } from "@google/genai";
import { PhysicsNode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function fetchPhysicsContent(query: string): Promise<PhysicsNode> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Explain the physics concept: "${query}". 
    Provide a structured response including:
    1. A clear explanation in plain text.
    2. Key formulas in LaTeX format (without $ delimiters).
    3. A list of physical quantities involved with their symbols, names, units, and brief descriptions.
    
    The response must be in JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          explanation: { type: Type.STRING },
          formulas: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          quantities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                name: { type: Type.STRING },
                unit: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["symbol", "name", "unit", "description"]
            }
          }
        },
        required: ["title", "explanation", "formulas", "quantities"]
      }
    }
  });

  const content = JSON.parse(response.text || "{}");
  return {
    id: Math.random().toString(36).substr(2, 9),
    ...content
  };
}
