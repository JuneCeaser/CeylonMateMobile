import React, { createContext, useState, useEffect, useContext } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserProfile({ uid: user.uid, ...docSnap.data() });
                    }
                } catch (error) {
                    console.error('Error loading user profile:', error);
                }
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setLoading(false);
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
            // 1. create Firebase auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. prepare Firestore-safe data (password MUST NOT be stored)
            const userDoc = {
                email: user.email,
                name: userData.name || "",
                phone: userData.phone || "",
                userType: userData.userType,
                createdAt: new Date().toISOString(),
            };

            // 3. Tourist fields
            if (userData.userType === 'tourist') {
                userDoc.country = userData.country || "";
                userDoc.preferences = userData.preferences || {
                    budgetRange: "medium",
                    activityInterests: []
                };
            }

            // 4. Hotel fields
            if (userData.userType === 'hotel') {
                userDoc.hotelName = userData.hotelName || "";
                userDoc.hotelAddress = userData.hotelAddress || "";
                userDoc.hotelCity = userData.hotelCity || "";
                userDoc.approved = false; // hotel accounts pending approval
            }

            // 5. Store cleaned object ONLY
            await setDoc(doc(db, 'users', user.uid), userDoc);

            return user;

        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
        } catch (error) {
            throw error;
        }
    };

    const value = {
        user,
        userProfile,
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
