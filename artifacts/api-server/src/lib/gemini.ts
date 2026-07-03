import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export function getModel(modelName = "gemini-2.5-flash") {
  return genAI.getGenerativeModel({ model: modelName });
}
