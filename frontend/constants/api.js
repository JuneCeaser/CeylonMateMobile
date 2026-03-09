import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

// YOUR COMPUTER IP
const API_URL = "http://192.168.8.195:5000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("userToken");

    if (token) {
      config.headers["x-auth-token"] = token;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      Alert.alert(
        "Network Error",
        "Cannot connect to the server. Check your Wi-Fi and backend is running."
      );
      return Promise.reject(error);
    }

    const status = error.response.status;
    const message =
      error.response.data?.message ||
      error.response.data?.error ||
      "Something went wrong.";

    if (status === 401 || status === 403) {
      Alert.alert("Session Expired", "Please login again.");
    } else {
      Alert.alert("Error", message);
    }

    return Promise.reject(error);
  }
);

export default api;