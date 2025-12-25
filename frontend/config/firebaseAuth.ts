// config/firebaseAuth.ts
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { app } from './firebaseApp';

let auth;

try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });
} catch {
    auth = getAuth(app);
}

export { auth };
