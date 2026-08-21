import dotenv from "dotenv";
dotenv.config();

const token = process.env.GEMINI_API_KEY;
console.log("Token:", token);
try {
  const parts = token.split('.');
  if(parts.length > 1) {
    const decoded = Buffer.from(parts[1], 'base64').toString();
    console.log("Decoded:", decoded);
  }
} catch (e) {
  console.log("Failed to decode base64");
}
