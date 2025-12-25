const Place = require('../models/Place');

// 1. Find a place near the user (Geofencing Logic)
exports.getNearbyPlace = async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and Longitude are required" });
  }

  try {
    // Find places within 1000 meters (1km) of the user
    // You can adjust 'maxDistance' depending on how close they need to be
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

// 2. Add a new Place (For you to populate the database)
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