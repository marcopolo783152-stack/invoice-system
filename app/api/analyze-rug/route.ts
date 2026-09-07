import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Clean base64 header if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
      You are an expert oriental rug appraiser.
      Analyze this image of a rug and extract the following details.
      Provide the response strictly as a JSON object matching this schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
              },
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            style: { type: Type.STRING, description: "The style of the rug (e.g., Persian, Oushak, Modern, Traditional, Kilim)" },
            colors: { type: Type.STRING, description: "The primary and secondary colors visible in the rug" },
            description: { type: Type.STRING, description: "A detailed 1-2 sentence description of the rug's pattern, motifs, and aesthetic." },
            estimatedWidthFeet: { type: Type.NUMBER, description: "Estimated width in feet (guess based on proportions)" },
            estimatedLengthFeet: { type: Type.NUMBER, description: "Estimated length in feet" },
          },
          required: ["style", "colors", "description"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error('No response from AI');
    
    const data = JSON.parse(text);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze image' }, { status: 500 });
  }
}
