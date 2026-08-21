import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  console.log("Key length:", process.env.GEMINI_API_KEY?.length);
  
  // Test 1: With httpOptions
  try {
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    await ai.models.generateContent({ model: 'gemini-3.6-flash', contents: 'hello' });
    console.log("Test 1 SUCCESS");
  } catch (e) {
    console.log("Test 1 FAILED:", e.message);
  }

  // Test 2: Without httpOptions
  try {
    const ai2 = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    await ai2.models.generateContent({ model: 'gemini-3.6-flash', contents: 'hello' });
    console.log("Test 2 SUCCESS");
  } catch (e) {
    console.log("Test 2 FAILED:", e.message);
  }
}
run();
