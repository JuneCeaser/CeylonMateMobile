import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your machine's local IP address
const API_URL = 'http://192.168.8.195:5000/api'; 

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
});

/**
 * Request Interceptor:
 * Automatically attaches the JWT token from AsyncStorage 
 * to the 'x-auth-token' header for every outgoing request.
 */
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