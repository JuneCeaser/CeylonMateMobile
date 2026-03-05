import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// YOUR COMPUTER IP (you said you will change manually)
const API_URL = 'http://192.168.8.195:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // little more stable than 10s
});

// ✅ Attach token automatically (if exists)
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');

    // Only attach if token exists
    if (token) {
      config.headers['x-auth-token'] = token;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Global response error handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // No response = server down / wifi issue
    if (!error.response) {
      Alert.alert(
        'Network Error',
        'Cannot connect to the server. Check your Wi-Fi and backend is running.'
      );
      return Promise.reject(error);
    }

    const status = error.response.status;
    const message =
      error.response.data?.message ||
      error.response.data?.error ||
      'Something went wrong.';

    // Token problems
    if (status === 401 || status === 403) {
      Alert.alert('Session Expired', 'Please login again.');
      // Optionally clear token:
      // await AsyncStorage.removeItem('userToken');
    } else {
      // Other errors (400, 404, 500)
      // Don’t spam user always — but ok for now as beginner
      Alert.alert('Error', message);
    }

    return Promise.reject(error);
  }
);

export default api;