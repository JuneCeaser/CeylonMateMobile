require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log("❌ Error: No GEMINI_API_KEY found in .env file");
    return;
  }
  
  console.log("🔑 Testing Key:", apiKey.substring(0, 10) + "...");

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // This connects to Google and asks for the list of models YOU can use
    // Note: We use the generic 'getGenerativeModel' to trigger a connection first
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // We try to generate a simple "Hello" to see if it works
    console.log("📡 Attempting to connect to Gemini...");
    const result = await model.generateContent("Hello");
    console.log("✅ SUCCESS! 'gemini-pro' works for this key.");
    console.log("Response:", result.response.text());

  } catch (error) {
    console.log("\n❌ 'gemini-pro' FAILED.");
    console.log("Error Message:", error.message);
    
    if (error.message.includes("404")) {
      console.log("\n💡 SOLUTION: Your key cannot see 'gemini-pro'.");
      console.log("Try changing your code to use: 'gemini-1.0-pro' or 'gemini-1.5-flash'");
    }
  }
}

checkAvailableModels();