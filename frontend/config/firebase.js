// config/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    initializeAuth,
    getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// --- Your Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyDyhxtFsLknkLj4vLEuqGAlIi2dYBKI1V8",
    authDomain: "ceylonmate-176eb.firebaseapp.com",
    projectId: "ceylonmate-176eb",
    storageBucket: "ceylonmate-176eb.firebasestorage.app",
    messagingSenderId: "906939597824",
    appId: "1:906939597824:web:e1b1db01a98b3ab1afc4e5",
    measurementId: "G-XBSYYWVZBF"
};

// Ensure app is only initialized once (important in Expo)
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// --- Auth Initialization (React Native persistence) ---
let auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });
} catch (e) {
    // Already initialized (Expo Fast Refresh)
    const { getAuth } = require('firebase/auth');
    auth = getAuth(app);
}

// Firestore
const db = getFirestore(app);

export { app, auth, db };
