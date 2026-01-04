const Place = require('../models/Place');
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. Find a place near user [MOBILE]
exports.getNearbyPlace = async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "Latitude and Longitude are required" });

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
    console.error("Error fetching nearby:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// 2. Add a new Place [ADMIN]
exports.addPlace = async (req, res) => {
  const { 
    name, description, history, facts, 
    latitude, longitude, 
    model3DNowUrl, model3DThenUrl, 
    arOverlayUrl, images 
  } = req.body;
  
  try {
    const newPlace = new Place({
      name, description, history, facts,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      model3DNowUrl, model3DThenUrl,
      arOverlayUrl, images
    });
    await newPlace.save();
    res.status(201).json({ msg: "Place added successfully", place: newPlace });
  } catch (err) {
    console.error("Error adding place:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// 3. Get details [MOBILE & ADMIN]
exports.getPlaceDetails = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ error: "Place not found" });
    res.status(200).json(place);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

// 4. Chatbot [MOBILE]
exports.chatWithPlace = async (req, res) => {
  const { placeId, question } = req.body;
  try {
    const place = await Place.findById(placeId);
    if (!place) return res.status(404).json({ error: "Place not found" });

    const systemPrompt = `You are a guide at ${place.name}. Context: ${place.description} ${place.history}`;
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
      model: "llama-3.3-70b-versatile", 
      temperature: 0.5,
      max_tokens: 200,
    });
    res.status(200).json({ answer: chatCompletion.choices[0]?.message?.content || "No answer." });
  } catch (err) {
    console.error("Groq Error:", err);
    res.status(500).json({ error: "AI Error" });
  }
};

// 👇👇👇 NEW FUNCTIONS FOR ADMIN PANEL 👇👇👇

// 5. GET ALL PLACES (For Admin Dashboard)
exports.getAllPlaces = async (req, res) => {
  try {
    // Sort by newest first
    const places = await Place.find().sort({ createdAt: -1 }); 
    res.status(200).json(places);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

// 6. DELETE PLACE
exports.deletePlace = async (req, res) => {
  try {
    await Place.findByIdAndDelete(req.params.id);
    res.status(200).json({ msg: "Place deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete Failed" });
  }
};

// 7. UPDATE PLACE
exports.updatePlace = async (req, res) => {
  try {
    const { latitude, longitude, ...rest } = req.body;
    
    // Check if location data exists to update the GeoJSON
    let updateData = { ...rest };
    if (latitude && longitude) {
        updateData.location = { 
            type: 'Point', 
            coordinates: [parseFloat(longitude), parseFloat(latitude)] 
        };
    }

    const place = await Place.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.status(200).json(place);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update Failed" });
  }
};