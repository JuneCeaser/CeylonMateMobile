// services/riskSimulator.js

// Helper: safely get a coordinate from multiple possible keys
const getCoord = (attr, keys) => {
    for (const key of keys) {
        if (attr[key] !== undefined && attr[key] !== null && attr[key] !== '') {
            const val = parseFloat(attr[key]);
            if (!Number.isNaN(val)) return val;
        }
    }
    return null;
};

export const simulateRiskData = (attractions) => {
    const locations = attractions.map((attr, index) => {
        // 1) Try to get latitude / longitude from your CSV-style keys first
        const latitude =
            getCoord(attr, ['latitude', 'lat', 'Latitude', 'LAT'])

        const longitude =
            getCoord(attr, ['longitude', 'lng', 'Longitude', 'LON', 'Lon'])

        const name =
            attr.name ||
            attr.Name ||
            attr.location ||
            attr.place ||
            attr.title ||
            `Location ${index + 1}`;

        // 2) Fallback to Sri Lanka center if we still don't have coords
        const latFinal = latitude ?? 7.8731;
        const lngFinal = longitude ?? 80.7718;

        // 3) Fake risk values (you can adjust logic later)
        const weatherRisk = Math.random() * 0.7;
        const trafficRisk = Math.random() * 0.7;
        const incidentRisk = Math.random() * 0.8;
        const riskScore = (weatherRisk + trafficRisk + incidentRisk) / 3;

        const simulatedData = {
            temperature: 24 + Math.round(Math.random() * 8),
            rainfall: Math.round(Math.random() * 50),
            windSpeed: 5 + Math.round(Math.random() * 25),
            congestionLevel: 3 + Math.round(Math.random() * 7),
            avgSpeed: 20 + Math.round(Math.random() * 40),
            trafficVolume: 500 + Math.round(Math.random() * 2500),
            recentAccidents: Math.round(Math.random() * 3),
            recentIncidents: Math.round(Math.random() * 4),
            severityLevel: 1 + Math.round(Math.random() * 4),
        };

        const riskFactors = [];
        if (weatherRisk > 0.5) riskFactors.push('Unstable or rainy weather expected.');
        if (trafficRisk > 0.5) riskFactors.push('High traffic congestion during peak hours.');
        if (incidentRisk > 0.5) riskFactors.push('Recent safety incidents in the surrounding area.');

        const recommendations = [];
        if (riskScore < 0.3) {
            recommendations.push('This area is generally safe. Enjoy your visit as planned.');
        } else if (riskScore < 0.6) {
            recommendations.push('Plan travel during daylight and avoid peak traffic hours.');
            recommendations.push('Check weather updates before traveling.');
        } else {
            recommendations.push('Consider visiting in the morning or choosing an alternative location.');
            recommendations.push('Avoid traveling alone at night in this area.');
        }

        return {
            name,
            latitude: latFinal,
            longitude: lngFinal,
            weatherRisk,
            trafficRisk,
            incidentRisk,
            riskScore,
            simulatedData,
            riskFactors,
            recommendations,
        };
    });

    const totalLocations = locations.length;
    const lowRisk = locations.filter((l) => l.riskScore < 0.3).length;
    const mediumRisk = locations.filter((l) => l.riskScore >= 0.3 && l.riskScore < 0.6).length;
    const highRisk = locations.filter((l) => l.riskScore >= 0.6).length;

    const averageRisk =
        totalLocations > 0
            ? locations.reduce((sum, l) => sum + l.riskScore, 0) / totalLocations
            : 0;

    return {
        locations,
        summary: {
            totalLocations,
            lowRisk,
            mediumRisk,
            highRisk,
            averageRisk,
        },
        timestamp: new Date().toISOString(),
    };
};
