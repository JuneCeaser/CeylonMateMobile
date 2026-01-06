// app/(tourist)/emergency-alert.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Alert,
    Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { cancelEmergencyAlert, getTimeSinceAlert } from '../../services/emergencyAlert';

export default function EmergencyAlertScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [pulseAnim] = useState(new Animated.Value(1));
    const [elapsedTime, setElapsedTime] = useState('');

    // Parse alert data from params
    const alertData = params.alertData ? JSON.parse(params.alertData) : null;

    // CRITICAL FIX: Extract alertId properly
    const alertId = params.alertId || alertData?.alertId || alertData?.id;

    // Pulsating animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Update elapsed time every minute
    useEffect(() => {
        if (!alertData) return;

        const updateTime = () => {
            setElapsedTime(getTimeSinceAlert(alertData.timestamp));
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);

        return () => clearInterval(interval);
    }, [alertData?.timestamp]);

    const handleCancelAlert = () => {
        Alert.alert(
            'Cancel Emergency Alert',
            'Are you sure you want to cancel this emergency alert?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log('Canceling alert with ID:', alertId);

                            if (!alertId) {
                                throw new Error('Alert ID is missing');
                            }

                            await cancelEmergencyAlert(alertId);
                            Alert.alert('Alert Cancelled', 'Your emergency alert has been cancelled.');
                            router.back();
                        } catch (error) {
                            console.error('Cancel error:', error);
                            Alert.alert('Error', `Failed to cancel alert: ${error.message}`);
                        }
                    },
                },
            ]
        );
    };

    const handleCallEmergency = () => {
        Alert.alert(
            'Call Emergency Services',
            'Call 119 (Sri Lanka Emergency)?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Call Now',
                    onPress: () => {
                        Linking.openURL('tel:119');
                    },
                },
            ]
        );
    };

    if (!alertData) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={64} color={Colors.danger} />
                <Text style={styles.errorText}>Alert data not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Pulsating Red Border */}
            <Animated.View
                style={[
                    styles.pulsingBorder,
                    {
                        transform: [{ scale: pulseAnim }],
                    },
                ]}
            />

            {/* Header */}
            <View style={styles.header}>
                <Animated.View
                    style={[
                        styles.alertBadge,
                        {
                            transform: [{ scale: pulseAnim }],
                        },
                    ]}
                >
                    <Ionicons name="warning" size={40} color={Colors.surface} />
                </Animated.View>
                <Text style={styles.headerTitle}>EMERGENCY ALERT ACTIVE</Text>
                <Text style={styles.headerSubtitle}>Help is on the way</Text>
                <Text style={styles.timeText}>{elapsedTime}</Text>
            </View>

            {/* Map */}
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: alertData.latitude,
                    longitude: alertData.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                <Marker
                    coordinate={{
                        latitude: alertData.latitude,
                        longitude: alertData.longitude,
                    }}
                >
                    <Animated.View
                        style={[
                            styles.userMarker,
                            {
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    >
                        <Ionicons name="person" size={28} color={Colors.surface} />
                    </Animated.View>
                </Marker>
            </MapView>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={styles.emergencyCallButton}
                    onPress={handleCallEmergency}
                >
                    <Ionicons name="call" size={24} color={Colors.surface} />
                    <Text style={styles.emergencyCallText}>Call 119</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelAlert}
                >
                    <Ionicons name="close-circle" size={24} color={Colors.danger} />
                    <Text style={styles.cancelButtonText}>Cancel Alert</Text>
                </TouchableOpacity>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={20} color={Colors.text} />
                    <Text style={styles.infoText}>{alertData.userName}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={20} color={Colors.text} />
                    <Text style={styles.infoText}>
                        {alertData.latitude.toFixed(6)}, {alertData.longitude.toFixed(6)}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={20} color={Colors.text} />
                    <Text style={styles.infoText}>
                        {new Date(alertData.timestamp).toLocaleString()}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.danger,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Spacing.xl,
    },
    errorText: {
        fontSize: 18,
        color: Colors.text,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    backButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    backButtonText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    pulsingBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 8,
        borderColor: Colors.danger,
        zIndex: 1,
        pointerEvents: 'none',
    },
    header: {
        backgroundColor: Colors.danger,
        paddingTop: 60,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        zIndex: 2,
    },
    alertBadge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: Spacing.xs,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.surface,
        opacity: 0.9,
    },
    timeText: {
        fontSize: 14,
        color: Colors.surface,
        opacity: 0.8,
        marginTop: Spacing.xs,
    },
    map: {
        flex: 1,
        margin: 8,
        borderRadius: BorderRadius.lg,
    },
    userMarker: {
        width: 37,
        height: 37,
        borderRadius: 35,
        backgroundColor: Colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: Colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    actionContainer: {
        flexDirection: 'row',
        padding: Spacing.lg,
        gap: Spacing.md,
        zIndex: 2,
    },
    emergencyCallButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF6B00',
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    emergencyCallText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 2,
        borderColor: Colors.danger,
    },
    cancelButtonText: {
        color: Colors.danger,
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoCard: {
        backgroundColor: Colors.surface,
        margin: Spacing.lg,
        marginTop: 0,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
        zIndex: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
    },
});