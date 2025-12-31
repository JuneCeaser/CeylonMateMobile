import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// YOUR COMPUTER IP (Ensure this matches the Metro Bundler log)
const API_URL = 'http://192.168.8.100:5000/api'; 

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
        config.headers['x-auth-token'] = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;