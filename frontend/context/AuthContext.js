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
    const [user, setUser] = useState(null); 
    const [userProfile, setUserProfile] = useState(null); 
    const [loading, setLoading] = useState(true); 
    const [authToken, setAuthToken] = useState(null); 

    /**
     * fetchProfileWithRetry:
     * Attempts to fetch the user's Firestore document with retry support.
     */
    const fetchProfileWithRetry = async (uid, attempts = 3) => {
        const docRef = doc(db, 'users', uid);
        for (let i = 0; i < attempts; i++) {
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) return docSnap.data();
                return null;
            } catch (error) {
                if (i === attempts - 1) {
                    console.error("Firestore fetch failed after maximum attempts:", error.message);
                    return null;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    };

    useEffect(() => {

        /**
         * Firebase auth state listener
         */
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);

            if (firebaseUser) {
                setUser(firebaseUser);

                try {
                    // 1️⃣ Get Firebase ID token for backend authentication
                    const token = await getIdToken(firebaseUser);

                    // 🔍 DEBUG: Show token in terminal
                    console.log("TOKEN:", token);

                    setAuthToken(token);
                    await AsyncStorage.setItem('userToken', token);

                    // 2️⃣ Fetch Firestore user profile
                    const profileData = await fetchProfileWithRetry(firebaseUser.uid);

                    if (profileData) {
                        setUserProfile({
                            uid: firebaseUser.uid,
                            ...profileData
                        });
                    }

                } catch (error) {
                    console.error('❌ AuthContext Initialization Error:', error.message);
                }

            } else {
                // 3️⃣ Clear states when logged out
                setUser(null);
                setUserProfile(null);
                setAuthToken(null);
                await AsyncStorage.removeItem('userToken');
            }

            setLoading(false);
        });

        return unsubscribe;

    }, []);

    /**
     * Login existing user
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
     * Register new user
     */
    const register = async (email, password, userData) => {
        try {

            // Create Firebase auth account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Set display name
            await updateProfile(firebaseUser, {
                displayName: userData.name
            });

            // Build Firestore profile
            const userDoc = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData.name || "",
                phone: userData.phone || "",
                userType: userData.userType,
                createdAt: new Date().toISOString(),
            };

            if (userData.userType === 'tourist') {
                userDoc.country = userData.country || "";
            } 
            else if (userData.userType === 'host') {
                userDoc.expertise = userData.expertise || "";
            }

            // Save profile
            await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);

            // Update local state
            setUserProfile(userDoc);

            return firebaseUser;

        } catch (error) {
            console.error("Registration service error:", error.message);
            throw error;
        }
    };

    /**
     * Logout user
     */
    const logout = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Logout error:", error.message);
            throw error;
        }
    };

    const value = {
        user,
        userProfile,
        authToken,
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Custom hook for accessing AuthContext
 */
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};