import { Asset } from 'expo-asset';

export const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
        });
        data.push(row);
    }

    return data;
};

const loadCsvFromAsset = async (module) => {
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    const response = await fetch(uri);
    const text = await response.text();
    return parseCSV(text);
};

export const loadAttractions = async () => {
    try {
        return await loadCsvFromAsset(
            require('../assets/data/tourist_attractions.csv')
        );
    } catch (error) {
        console.error('Error loading attractions:', error);
        return [];
    }
};

export const loadHotels = async () => {
    try {
        return await loadCsvFromAsset(
            require('../assets/data/hotels.csv')
        );
    } catch (error) {
        console.error('Error loading hotels:', error);
        return [];
    }
};

