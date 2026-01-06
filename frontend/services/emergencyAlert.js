// services/emergencyAlert.js
import { collection, addDoc, updateDoc, doc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';

/**
 * Request location permissions
 */
export const requestLocationPermission = async () => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
    }
};

/**
 * Get current location
 */
export const getCurrentLocation = async () => {
    try {
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });
        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
    } catch (error) {
        console.error('Error getting location:', error);
        throw error;
    }
};

/**
 * Trigger emergency alert
 */
export const triggerEmergencyAlert = async (userId, userName) => {
    try {
        // Get current location
        const location = await getCurrentLocation();

        // Create alert in Firestore
        const alertData = {
            userId,
            userName,
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString(),
            status: 'active',
            createdAt: new Date(),
        };

        const docRef = await addDoc(collection(db, 'emergencyAlerts'), alertData);

        return {
            alertId: docRef.id,
            ...alertData,
        };
    } catch (error) {
        console.error('Error triggering emergency alert:', error);
        throw error;
    }
};

/**
 * Cancel emergency alert
 */
export const cancelEmergencyAlert = async (alertId) => {
    try {
        await deleteDoc(doc(db, 'emergencyAlerts', alertId));
    } catch (error) {
        console.error('Error canceling alert:', error);
        throw error;
    }
};

/**
 * Listen to active emergency alerts
 */
export const subscribeToEmergencyAlerts = (callback) => {
    const q = query(
        collection(db, 'emergencyAlerts'),
        where('status', '==', 'active')
    );

    return onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        callback(alerts);
    });
};

/**
 * Check if user has active alert
 */
export const getUserActiveAlert = (alerts, userId) => {
    return alerts.find(alert => alert.userId === userId && alert.status === 'active');
};

/**
 * Calculate time since alert
 */
export const getTimeSinceAlert = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
};