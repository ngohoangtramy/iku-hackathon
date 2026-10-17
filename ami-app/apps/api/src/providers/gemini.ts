import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `You are Ami's AI companion. You are a calm, reassuring presence. You are clearly an AI, never a human. You help women feel safer navigating unfamiliar places. You can suggest nearby public places or help contact trusted people when explicitly asked. You are friendly, warm, and non-judgmental. For UK users: if the user seems in danger, encourage them to call 999 or 112. Never diagnose emotions or claim certainty about someone's safety state.`;

const DEMO_RESPONSES = [
  "I'm right here with you. Take a steady breath. How is the lighting on the street ahead?",
  "I'm staying on the line with you. There's a well-lit coffee shop and a pharmacy just about two minutes ahead if you'd like to step inside.",
  "You're doing great. Keep your head up and stay aware of your surroundings. Would you like me to keep chatting with you until you reach your destination?",
  "I'm here listening. Remember, if you feel you are in immediate danger at any point, tap the red button on your screen to call 999 or 112 right away.",
  "That sounds like a good plan. Walk at a comfortable, steady pace. I'll stay right here with you until you're safely inside.",
  "I hear you. Staying on a well-lit main avenue is always a sensible choice. I'm right here beside you.",
];

let demoResponseIndex = 0;

export async function getAmiResponse(userMessage: string, context?: string): Promise<{ response: string; isMock: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    const response = DEMO_RESPONSES[demoResponseIndex % DEMO_RESPONSES.length];
    demoResponseIndex++;
    return {
      response,
      isMock: true,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const prompt = context
      ? `User Context: ${context}\n\nUser Message: ${userMessage}`
      : userMessage;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return {
      response: text || DEMO_RESPONSES[0],
      isMock: false,
    };
  } catch (error: any) {
    console.warn('[GEMINI] API request error, falling back to companion response:', error.message);
    const response = DEMO_RESPONSES[demoResponseIndex % DEMO_RESPONSES.length];
    demoResponseIndex++;
    return {
      response,
      isMock: true,
    };
  }
}
