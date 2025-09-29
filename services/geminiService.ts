import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

const initializeGenAI = (apiKey: string) => {
  if (!ai || (ai as any)._apiKey !== apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const generateCampaignMessage = async (apiKey: string, prompt: string): Promise<string[]> => {
  if (!apiKey) throw new Error("Gemini API key is not set.");
  const genAI = initializeGenAI(apiKey);

  try {
    const response: GenerateContentResponse = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 3 distinct variations of a WhatsApp promotional message based on this prompt: "${prompt}". The messages should be friendly, engaging, and have a clear call to action. Ensure they are concise and suitable for a mobile audience.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                variations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        }
      }
    });

    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.variations || [];
  } catch (error) {
    console.error("Error generating campaign message:", error);
    throw new Error("Failed to generate message from AI. Check your API key and prompt.");
  }
};

export const translateText = async (apiKey: string, text: string, language: string): Promise<string> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const genAI = initializeGenAI(apiKey);

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following text to ${language}: "${text}"`,
        });
        return response.text;
    } catch (error) {
        console.error("Error translating text:", error);
        throw new Error("Failed to translate text.");
    }
};