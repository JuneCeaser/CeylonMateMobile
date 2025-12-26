const Place = require('../models/Place');
// Initialize OpenAI (Make sure you installed: npm install openai)
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// 1. Find a place near the user (Geofencing Logic)
exports.getNearbyPlace = async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and Longitude are required" });
  }

  try {
    // Find places within 1000 meters (1km) of the user
    const places = await Place.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 1000 
        }
      }
    });

    if (places.length === 0) {
      return res.status(200).json({ message: "No historical places found nearby." });
    }

    // Return the closest place
    res.status(200).json(places[0]); 
  } catch (err) {
    console.error("Error fetching nearby place:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// 2. Add a new Place (For populating the database)
exports.addPlace = async (req, res) => {
  const { name, description, history, latitude, longitude, model3DUrl, arOverlayUrl, images } = req.body;

  try {
    const newPlace = new Place({
      name,
      description,
      history,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude] // Note: MongoDB uses [Long, Lat]
      },
      model3DUrl,
      arOverlayUrl,
      images
    });

    await newPlace.save();
    res.status(201).json({ msg: "Place added successfully", place: newPlace });
  } catch (err) {
    console.error("Error adding place:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// 3. Get details of a specific place by ID
exports.getPlaceDetails = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ error: "Place not found" });
    res.status(200).json(place);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const Place = require('../models/Place');
// Import Google Gemini SDK
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // "flash" is fast and cheap/free

// ... (Keep getNearbyPlace, addPlace, getPlaceDetails as they are) ...

// 4. Component 1: Context-Aware Chatbot (Using Gemini)
exports.chatWithPlace = async (req, res) => {
  const { placeId, question } = req.body;

  try {
    // A. Retrieve trusted data
    const place = await Place.findById(placeId);
    if (!place) return res.status(404).json({ error: "Place not found" });

    // B. Context Builder
    // We combine the system instructions + context + user question into one prompt
    const prompt = `
      You are an expert historical guide at ${place.name}.
      Use ONLY the following context to answer the user's question.
      If the answer is not in the context, politely say you don't know.
      Keep your answer concise (under 3 sentences).

      Context:
      - Description: ${place.description}
      - History: ${place.history}

      User Question: ${question}
    `;

    // C. Call Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    res.status(200).json({ answer });

  } catch (err) {
    console.error("Gemini Chat Error:", err);
    res.status(500).json({ error: "AI Service Error" });
  }
};