import React, { createContext, useState, useEffect, useContext } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    getIdToken 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authToken, setAuthToken] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true); // Start loading when auth state changes
            
            if (firebaseUser) {
                console.log("User detected in Firebase Auth:", firebaseUser.uid);
                setUser(firebaseUser);
                
                try {
                    const token = await getIdToken(firebaseUser);
                    setAuthToken(token);
                    await AsyncStorage.setItem('userToken', token);

                    // Fetch user profile from Firestore
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        console.log("Profile data loaded from Firestore:", data.userType);
                        setUserProfile({ uid: firebaseUser.uid, ...data });
                    } else {
                        console.warn("No profile document found in Firestore for this user!");
                        setUserProfile(null);
                    }
                } catch (error) {
                    console.error('Error loading user profile or token:', error);
                }
            } else {
                console.log("No user signed in.");
                setUser(null);
                setUserProfile(null);
                setAuthToken(null);
                await AsyncStorage.removeItem('userToken');
            }
            
            setLoading(false); // Only set loading to false after profile attempt is finished
        });

        return unsubscribe;
    }, []);

    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    };

    const register = async (email, password, userData) => {
        try {
            // 1. Create Firebase Auth account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // 2. Prepare Profile Document
            const userDoc = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData.name || "",
                phone: userData.phone || "",
                userType: userData.userType,
                createdAt: new Date().toISOString(),
            };

            // Role-specific field mapping
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
                userDoc.approved = false; 
            } else if (userData.userType === 'host') {
                userDoc.villageName = userData.villageName || "";
                userDoc.expertise = userData.expertise || ""; 
                userDoc.bio = userData.bio || "";
                userDoc.isVerifiedHost = true;
            }

            // 3. Save to Firestore with a secondary check for Rules errors
            try {
                await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);
                console.log("Firestore profile created successfully for:", userData.userType);
            } catch (dbError) {
                console.error("Firestore Save Failed. Check Security Rules:", dbError);
                Alert.alert(
                    "Database Error", 
                    "Your account was created, but we couldn't save your profile settings. Please contact support."
                );
            }

            return firebaseUser;
        } catch (error) {
            throw error;
        }
    };

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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};