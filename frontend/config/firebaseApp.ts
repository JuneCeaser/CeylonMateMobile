// config/firebaseApp.ts
import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
    apiKey: "AIzaSyDyhxtFsLknkLj4vLEuqGAlIi2dYBKI1V8",
    authDomain: "ceylonmate-176eb.firebaseapp.com",
    projectId: "ceylonmate-176eb",
    storageBucket: "ceylonmate-176eb.firebasestorage.app",
    messagingSenderId: "906939597824",
    appId: "1:906939597824:web:e1b1db01a98b3ab1afc4e5",
    measurementId: "G-XBSYYWVZBF"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
