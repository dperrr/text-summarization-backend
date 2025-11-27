import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const paragraphSchema = z.object({
  paragraphType: z.string().describe("Type of the paragraph: expository, narrative, descriptive, argumentative, etc."),
  mainIdea: z.string().describe("The main idea of the paragraph."),
  keyPoints: z.array(z.string()).describe("Key points extracted from the paragraph."),
  tone: z.string().describe("Tone of the paragraph: positive, negative, neutral, etc."),
});

export default async function structuredSummary(req, res) {
  if (req.method !== "POST") 
    return res.status(405).json({ error: "Method not allowed" });

  const { abstractiveSummary } = req.body || {};
  if (!abstractiveSummary) 
    return res.status(400).json({ error: "abstractiveSummary is required" });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
Analyze the following paragraph and return JSON strictly following this exact schema:
{
  "paragraphType": "string (Type of the paragraph: expository, narrative, descriptive, argumentative, etc.)",
  "mainIdea": "string (The main idea of the paragraph)",
  "keyPoints": ["array of strings with key points"],
  "tone": "string (Tone: positive, negative, neutral, etc.)"
}

Do NOT add any other fields. Do NOT add any text outside the JSON.

Paragraph:
${abstractiveSummary}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(paragraphSchema),
      },
    });

   
    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) {
      console.error("No text in response:", response);
      throw new Error("No text returned from AI");
    }

    console.log("Raw AI response:", rawText);

    const parsedJson = JSON.parse(rawText);
    const json = paragraphSchema.parse(parsedJson);
    
    console.log("Validated JSON:", json);
    
    return res.status(200).json(json);
  } catch (err) {
    console.error("Backend error:", err);
    
    if (err.name === 'ZodError') {
      return res.status(500).json({ 
        error: "Schema validation failed", 
        details: err.errors,
        message: "The AI response doesn't match the expected schema"
      });
    }
    
    return res.status(500).json({ 
      error: "API request failed", 
      details: err.message
    });
  }
}