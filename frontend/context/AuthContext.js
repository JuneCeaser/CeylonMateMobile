import React, { createContext, useState, useEffect, useContext } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    getIdToken,
    updateProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize the Auth Context
const AuthContext = createContext({});

/**
 * AuthProvider: The main wrapper component that manages global user state.
 * It handles Firebase Authentication, Firestore profile syncing, and session persistence.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Firebase Auth raw user object
    const [userProfile, setUserProfile] = useState(null); // Detailed user data from Firestore (Role, Name, etc.)
    const [loading, setLoading] = useState(true); // State to track if the app is still determining auth status
    const [authToken, setAuthToken] = useState(null); // JWT ID token for making authorized requests to your Node.js backend

    /**
     * fetchProfileWithRetry:
     * Attempts to fetch the user's Firestore document. 
     * Includes a retry mechanism to handle temporary network fluctuations or offline states.
     */
    const fetchProfileWithRetry = async (uid, attempts = 3) => {
        const docRef = doc(db, 'users', uid);
        for (let i = 0; i < attempts; i++) {
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) return docSnap.data();
                return null;
            } catch (error) {
                // If this was the last attempt, stop and return null
                if (i === attempts - 1) {
                    console.error("Firestore fetch failed after maximum attempts:", error.message);
                    return null;
                }
                // Wait for 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    };

    useEffect(() => {
        /**
         * onAuthStateChanged: 
         * Firebase listener that triggers whenever a user logs in, logs out, or the app refreshes.
         */
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true); 
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    // 1. Retrieve the JWT ID token for backend API authentication
                    const token = await getIdToken(firebaseUser);
                    setAuthToken(token);
                    await AsyncStorage.setItem('userToken', token);

                    // 2. Fetch the corresponding user profile from Firestore (contains Role: Host/Tourist)
                    const profileData = await fetchProfileWithRetry(firebaseUser.uid);
                    if (profileData) {
                        setUserProfile({ uid: firebaseUser.uid, ...profileData });
                    }
                } catch (error) {
                    console.error('❌ AuthContext Initialization Error:', error.message);
                }
            } else {
                // 3. Clear all states when the user logs out
                setUser(null);
                setUserProfile(null);
                setAuthToken(null);
                await AsyncStorage.removeItem('userToken');
            }
            setLoading(false);
        });

        // Cleanup the listener when the component is destroyed
        return unsubscribe;
    }, []);

    /**
     * login: Authenticates existing users using email and password.
     */
    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error("Login service error:", error.code);
            throw error;
        }
    };

    /**
     * register: Creates a new account in Firebase Auth and initializes a Firestore profile document.
     */
    const register = async (email, password, userData) => {
        try {
            // 1. Create the Firebase Authentication account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // 2. Set the display name in the Firebase Auth profile
            await updateProfile(firebaseUser, { displayName: userData.name });

            // 3. Construct the profile document for Firestore
            const userDoc = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData.name || "",
                phone: userData.phone || "",
                userType: userData.userType, // 'tourist' or 'host'
                createdAt: new Date().toISOString(),
            };

            // Add role-specific details
            if (userData.userType === 'tourist') {
                userDoc.country = userData.country || "";
            } else if (userData.userType === 'host') {
                userDoc.expertise = userData.expertise || "";
            }

            // 4. Save the profile document to Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);
            
            // 5. Update local state to reflect the new user
            setUserProfile(userDoc);
            return firebaseUser;
        } catch (error) {
            console.error("Registration service error:", error.message);
            throw error;
        }
    };

    /**
     * logout: Logs out the current user and clears local storage tokens.
     */
    const logout = async () => {
        try {
            await firebaseSignOut(auth);
            // Local states are automatically cleared by the onAuthStateChanged listener above
        } catch (error) {
            console.error("Logout error:", error.message);
            throw error;
        }
    };

    // Values to be shared across the entire application
    const value = { 
        user, 
        userProfile, 
        authToken, 
        login, 
        register, 
        logout, 
        loading 
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth: Custom hook to easily access auth state from any functional component.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};