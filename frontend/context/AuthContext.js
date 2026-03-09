import React, { createContext, useState, useEffect, useContext } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdToken,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  const fetchProfileWithRetry = async (uid, attempts = 3) => {
    const docRef = doc(db, "users", uid);

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
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const token = await getIdToken(firebaseUser);
          setAuthToken(token);
          await AsyncStorage.setItem("userToken", token);

          const profileData = await fetchProfileWithRetry(firebaseUser.uid);

          if (profileData) {
            setUserProfile({
              uid: firebaseUser.uid,
              ...profileData,
            });
          } else {
            const fallbackProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || "",
              phone: "",
              bio: "",
              location: "",
              profileImage: "",
              role: "tourist",
              createdAt: new Date().toISOString(),
            };

            await setDoc(doc(db, "users", firebaseUser.uid), fallbackProfile, { merge: true });
            setUserProfile(fallbackProfile);
          }
        } catch (error) {
          console.error("AuthContext Initialization Error:", error.message);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setAuthToken(null);
        await AsyncStorage.removeItem("userToken");
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
      console.error("Login service error:", error.code);
      throw error;
    }
  };

  const register = async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, {
        displayName: userData.name,
      });

      const role = userData.userType || "tourist";

      const userDoc = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: userData.name || "",
        phone: userData.phone || "",
        role,
        userType: role,
        createdAt: new Date().toISOString(),
        bio: "",
        location: "",
        profileImage: "",
      };

      if (role === "tourist") {
        userDoc.country = userData.country || "";
      } else if (role === "host") {
        userDoc.expertise = userData.expertise || "";
      }

      await setDoc(doc(db, "users", firebaseUser.uid), userDoc, { merge: true });
      setUserProfile(userDoc);

      return firebaseUser;
    } catch (error) {
      console.error("Registration service error:", error.message);
      throw error;
    }
  };

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
    setUserProfile,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};