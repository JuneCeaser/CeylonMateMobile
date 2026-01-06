// services/hotelData.js

export const sriLankanHotels = [
    // Colombo
    {
        id: 'hotel_1',
        name: 'Galle Face Hotel',
        city: 'Colombo',
        district: 'Colombo',
        category: 'Luxury',
        rating: 4.8,
        pricePerNight: 25000,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        amenities: ['Pool', 'Spa', 'Restaurant', 'Ocean View'],
        latitude: 6.9271,
        longitude: 79.8612,
    },
    {
        id: 'hotel_2',
        name: 'Cinnamon Grand Colombo',
        city: 'Colombo',
        district: 'Colombo',
        category: 'Luxury',
        rating: 4.7,
        pricePerNight: 22000,
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        amenities: ['Pool', 'Gym', 'Multiple Restaurants'],
        latitude: 6.9271,
        longitude: 79.8612,
    },
    // Kandy
    {
        id: 'hotel_3',
        name: 'Thilanka Hotel Kandy',
        city: 'Kandy',
        district: 'Kandy',
        category: 'Mid-range',
        rating: 4.5,
        pricePerNight: 12000,
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        amenities: ['Restaurant', 'City View', 'Free WiFi'],
        latitude: 7.2906,
        longitude: 80.6337,
    },
    {
        id: 'hotel_4',
        name: 'Earls Regency Hotel',
        city: 'Kandy',
        district: 'Kandy',
        category: 'Luxury',
        rating: 4.6,
        pricePerNight: 18000,
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
        amenities: ['Pool', 'Spa', 'Hill Views', 'Restaurant'],
        latitude: 7.2906,
        longitude: 80.6337,
    },
    // Galle
    {
        id: 'hotel_5',
        name: 'Jetwing Lighthouse',
        city: 'Galle',
        district: 'Galle',
        category: 'Luxury',
        rating: 4.9,
        pricePerNight: 28000,
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
        amenities: ['Beach Access', 'Pool', 'Spa', 'Ocean View'],
        latitude: 6.0367,
        longitude: 80.2170,
    },
    {
        id: 'hotel_6',
        name: 'Amangalla',
        city: 'Galle',
        district: 'Galle',
        category: 'Luxury',
        rating: 4.9,
        pricePerNight: 45000,
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
        amenities: ['Historic Building', 'Pool', 'Fine Dining'],
        latitude: 6.0367,
        longitude: 80.2170,
    },
    // Sigiriya
    {
        id: 'hotel_7',
        name: 'Heritance Kandalama',
        city: 'Dambulla',
        district: 'Matale',
        category: 'Luxury',
        rating: 4.7,
        pricePerNight: 24000,
        image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
        amenities: ['Infinity Pool', 'Nature Views', 'Spa'],
        latitude: 7.9403,
        longitude: 80.6431,
    },
    {
        id: 'hotel_8',
        name: 'Sigiriya Village',
        city: 'Sigiriya',
        district: 'Matale',
        category: 'Mid-range',
        rating: 4.4,
        pricePerNight: 15000,
        image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800',
        amenities: ['Pool', 'Restaurant', 'Garden View'],
        latitude: 7.9564,
        longitude: 80.7597,
    },
    // Ella
    {
        id: 'hotel_9',
        name: '98 Acres Resort',
        city: 'Ella',
        district: 'Badulla',
        category: 'Luxury',
        rating: 4.8,
        pricePerNight: 20000,
        image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
        amenities: ['Mountain Views', 'Tea Estate', 'Restaurant'],
        latitude: 6.8667,
        longitude: 81.0467,
    },
    {
        id: 'hotel_10',
        name: 'Zion View Hotel',
        city: 'Ella',
        district: 'Badulla',
        category: 'Budget',
        rating: 4.3,
        pricePerNight: 8000,
        image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
        amenities: ['Mountain Views', 'Free WiFi', 'Rooftop'],
        latitude: 6.8667,
        longitude: 81.0467,
    },
    // Mirissa
    {
        id: 'hotel_11',
        name: 'Paradise Beach Club',
        city: 'Mirissa',
        district: 'Matara',
        category: 'Mid-range',
        rating: 4.5,
        pricePerNight: 14000,
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        amenities: ['Beach Access', 'Pool', 'Bar'],
        latitude: 5.9451,
        longitude: 80.4585,
    },
    {
        id: 'hotel_12',
        name: 'Mandara Resort',
        city: 'Mirissa',
        district: 'Matara',
        category: 'Luxury',
        rating: 4.7,
        pricePerNight: 22000,
        image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
        amenities: ['Private Beach', 'Pool', 'Spa', 'Seafood Restaurant'],
        latitude: 5.9451,
        longitude: 80.4585,
    },
    // Yala
    {
        id: 'hotel_13',
        name: 'Jetwing Yala',
        city: 'Yala',
        district: 'Hambantota',
        category: 'Luxury',
        rating: 4.6,
        pricePerNight: 26000,
        image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
        amenities: ['Wildlife Views', 'Pool', 'Safari Tours'],
        latitude: 6.3714,
        longitude: 81.5298,
    },
    {
        id: 'hotel_14',
        name: 'Cinnamon Wild Yala',
        city: 'Yala',
        district: 'Hambantota',
        category: 'Luxury',
        rating: 4.8,
        pricePerNight: 30000,
        image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
        amenities: ['Beachfront', 'Pool', 'Wildlife Tours', 'Spa'],
        latitude: 6.2737,
        longitude: 81.2535,
    },
    // Nuwara Eliya
    {
        id: 'hotel_15',
        name: 'Grand Hotel Nuwara Eliya',
        city: 'Nuwara Eliya',
        district: 'Nuwara Eliya',
        category: 'Heritage',
        rating: 4.5,
        pricePerNight: 16000,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        amenities: ['Historic', 'Golf Course', 'Restaurant'],
        latitude: 6.9497,
        longitude: 80.7891,
    },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Find best hotels for an itinerary
 * @param {Array} attractions - Selected attractions
 * @param {number} days - Number of days
 * @param {number} budget - Total budget
 * @returns {Array} Recommended hotels
 */
export const findBestHotels = (attractions, days, budget) => {
    // Number of nights = days - 1 (check out on last day)
    const numberOfNights = Math.max(days - 1, 1);

    // Budget per night (30% of total budget allocated for accommodation)
    const accommodationBudget = budget * 0.3;
    const budgetPerNight = accommodationBudget / numberOfNights;

    // Calculate center point of attractions
    const centerLat = attractions.reduce((sum, a) => sum + parseFloat(a.latitude || 0), 0) / attractions.length;
    const centerLon = attractions.reduce((sum, a) => sum + parseFloat(a.longitude || 0), 0) / attractions.length;

    // Score each hotel
    const scoredHotels = sriLankanHotels.map(hotel => {
        let score = 0;

        // Distance to attractions center (closer is better, max 50km reasonable)
        const distance = calculateDistance(centerLat, centerLon, hotel.latitude, hotel.longitude);
        const distanceScore = Math.max(0, 1 - (distance / 100)); // Normalize to 0-1
        score += distanceScore * 0.4;

        // Price match (closer to budget is better)
        const priceDiff = Math.abs(hotel.pricePerNight - budgetPerNight);
        const priceScore = Math.max(0, 1 - (priceDiff / budgetPerNight));
        score += priceScore * 0.3;

        // Rating
        score += (hotel.rating / 5) * 0.3;

        return {
            ...hotel,
            score,
            distanceToAttractions: Math.round(distance),
        };
    });

    // Sort by score and return top hotels
    // If multiple nights, try to diversify locations
    const sortedHotels = scoredHotels.sort((a, b) => b.score - a.score);

    const selectedHotels = [];
    const usedCities = new Set();

    for (const hotel of sortedHotels) {
        if (selectedHotels.length >= numberOfNights) break;

        // For longer trips, try to vary cities
        if (numberOfNights > 2 && usedCities.has(hotel.city)) {
            continue; // Skip, already have a hotel in this city
        }

        if (hotel.pricePerNight <= budgetPerNight * 1.5) { // Allow 50% over budget
            selectedHotels.push(hotel);
            usedCities.add(hotel.city);
        }
    }

    // If we don't have enough hotels, fill with any remaining within budget
    if (selectedHotels.length < numberOfNights) {
        for (const hotel of sortedHotels) {
            if (selectedHotels.length >= numberOfNights) break;
            if (!selectedHotels.includes(hotel) && hotel.pricePerNight <= budgetPerNight * 2) {
                selectedHotels.push(hotel);
            }
        }
    }

    return selectedHotels.slice(0, numberOfNights);
};

/**
 * Generate smart itinerary name based on activity types
 */
export const generateItineraryName = (activityTypes) => {
    if (!activityTypes || activityTypes.length === 0) {
        return 'Sri Lanka Discovery';
    }

    const typeNames = {
        cultural: 'Cultural',
        beach: 'Beach',
        wildlife: 'Wildlife',
        adventure: 'Adventure',
        nature: 'Nature',
        historical: 'Historical',
    };

    if (activityTypes.length === 1) {
        return `${typeNames[activityTypes[0]]} Adventure`;
    }

    if (activityTypes.length === 2) {
        return `${typeNames[activityTypes[0]]} & ${typeNames[activityTypes[1]]} Expedition`;
    }

    if (activityTypes.length >= 3) {
        return 'Sri Lanka Discovery Tour';
    }

    return 'Custom Sri Lanka Experience';
};