import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const token = process.env.GEMINI_API_KEY;
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hello" }] }]
      })
    });
    const data = await response.json();
    console.log("Response with Bearer:", JSON.stringify(data).slice(0, 200));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
run();
