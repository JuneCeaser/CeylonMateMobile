const Place = require('../models/Place');
// Import Groq SDK
const Groq = require("groq-sdk");

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. Find a place near the user historical place
exports.getNearbyPlace = async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and Longitude are required" });
  }

  try {
    const places = await Place.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 1000 
        }
      }
    });

    if (places.length === 0) return res.status(200).json({ message: "No historical places found nearby." });
    res.status(200).json(places[0]); 
  } catch (err) {
    console.error("Error fetching nearby place:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// 2. Add a new Place
exports.addPlace = async (req, res) => {
  // 👇 Add 'facts' to the extraction list
  const { name, description, history, facts, latitude, longitude, model3DUrl, arOverlayUrl, images } = req.body;
  
  try {
    const newPlace = new Place({
      name, description, history, facts, // 👈 Save it here
      location: { type: 'Point', coordinates: [longitude, latitude] },
      model3DUrl, arOverlayUrl, images
    });
    await newPlace.save();
    res.status(201).json({ msg: "Place added successfully", place: newPlace });
  } catch (err) {
    console.error("Error adding place:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// 3. Get details
exports.getPlaceDetails = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ error: "Place not found" });
    res.status(200).json(place);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

// 4. Component 1: Context-Aware Chatbot (USING GROQ API)
exports.chatWithPlace = async (req, res) => {
  const { placeId, question } = req.body;

  try {
    // A. Retrieve trusted data (The "Memory")
    const place = await Place.findById(placeId);
    if (!place) return res.status(404).json({ error: "Place not found" });

    // B. Context Builder
    const systemPrompt = `
      You are an expert historical guide at ${place.name}.
      Use ONLY the following context to answer the user's question.
      If the answer is not in the context, politely say you don't know.
      Keep your answer concise (under 3 sentences).

      Context:
      - Description: ${place.description}
      - History: ${place.history}
    `;

    // C. Call Groq API
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      // UPDATED MODEL NAME HERE:
      model: "llama-3.3-70b-versatile", 
      temperature: 0.5,
      max_tokens: 200,
    });

    const answer = chatCompletion.choices[0]?.message?.content || "I couldn't generate an answer.";

    // Send the answer back to the app
    res.status(200).json({ answer });

  } catch (err) {
    console.error("Groq Chat Error:", err);
    res.status(500).json({ error: "AI Service Error" });
  }
};