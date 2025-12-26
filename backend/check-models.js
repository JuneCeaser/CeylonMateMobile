require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listMyModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log("❌ Error: No GEMINI_API_KEY found in .env file");
    return;
  }
  
  console.log("🔑 Testing Key:", apiKey.substring(0, 10) + "...");
  console.log("📡 Connecting to Google to list available models...");

  // We use the REST API directly to see the raw list because the SDK hides some errors.
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.log("\n❌ API Error:", data.error.message);
      return;
    }

    if (!data.models) {
      console.log("\n❌ No models found. Your API is likely disabled in Google Cloud.");
      console.log("👉 Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
      return;
    }

    console.log("\n✅ SUCCESS! Here are the models your key can use:");
    console.log("------------------------------------------------");
    data.models.forEach(model => {
      // We only care about models that support 'generateContent'
      if (model.supportedGenerationMethods.includes("generateContent")) {
        console.log(`Model Name: ${model.name.replace("models/", "")}`);
      }
    });
    console.log("------------------------------------------------");
    console.log("👉 Pick one of the names above and put it in your placeController.js!");

  } catch (error) {
    console.error("\n❌ Network Error:", error.message);
  }
}

listMyModels();