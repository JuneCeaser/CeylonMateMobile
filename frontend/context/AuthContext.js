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
import { Alert } from 'react-native';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Stores the raw Firebase Auth user object
    const [userProfile, setUserProfile] = useState(null); // Stores extra user data from Firestore
    const [loading, setLoading] = useState(true); // Tracks global loading state
    const [authToken, setAuthToken] = useState(null); // Stores the ID token for API requests

    useEffect(() => {
        /**
         * Listen for authentication state changes (Login/Logout/App Refresh)
         */
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true); 
            
            if (firebaseUser) {
                // User is signed in
                setUser(firebaseUser);
                
                try {
                    // Fetch the latest ID token for backend authentication
                    const token = await getIdToken(firebaseUser);
                    setAuthToken(token);
                    await AsyncStorage.setItem('userToken', token);

                    // Fetch additional user details from Firestore (Role, Village, etc.)
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserProfile({ uid: firebaseUser.uid, ...data });
                    } else {
                        setUserProfile(null);
                    }
                } catch (error) {
                    console.error('Error loading user profile or token:', error);
                }
            } else {
                // User is signed out, clear all states
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
     * Sign in existing users with Email and Password
     */
    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    };

    /**
     * Register new users and create their profile in Firestore
     */
    const register = async (email, password, userData) => {
        try {
            // 1. Create account in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // 2. Set the Display Name in Firebase Auth Profile 
            // (Crucial for showing the name in the dashboard immediately)
            await updateProfile(firebaseUser, {
                displayName: userData.name
            });

            // 3. Prepare the Profile Document for Firestore
            const userDoc = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData.name || "",
                phone: userData.phone || "",
                userType: userData.userType,
                createdAt: new Date().toISOString(),
            };

            // Mapping role-specific data based on User Type
            if (userData.userType === 'tourist') {
                userDoc.country = userData.country || "";
                userDoc.preferences = userData.preferences || {
                    budgetRange: "medium",
                    activityInterests: []
                };
            } else if (userData.userType === 'hotel') {
                userDoc.hotelName = userData.hotelName || "";
                userDoc.hotelAddress = userData.hotelAddress || "";
                userDoc.hotelCity = userData.hotelCity || "";
                userDoc.approved = false; // Hotel accounts require admin approval
            } else if (userData.userType === 'host') {
                userDoc.villageName = userData.villageName || "";
                userDoc.expertise = userData.expertise || ""; 
                userDoc.bio = userData.bio || "";
                userDoc.isVerifiedHost = true;
            }

            // 4. Save the user document to Firestore 'users' collection
            await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);
            
            // 5. Update local state so UI reflects the new user data without needing a refresh
            setUserProfile(userDoc);

            return firebaseUser;
        } catch (error) {
            throw error;
        }
    };

    /**
     * Sign out user and clean up local storage
     */
    const logout = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            setAuthToken(null);
            await AsyncStorage.removeItem('userToken');
        } catch (error) {
            throw error;
        }
    };

    // Shared values accessible via useAuth() hook
    const value = {
        user,
        userProfile,
        authToken,
        login,
        register,
        logout,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to easily consume Auth context throughout the app
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};