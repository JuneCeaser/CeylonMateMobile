// app/(tourist)/emergency-map.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { subscribeToEmergencyAlerts, getTimeSinceAlert, getCurrentLocation } from '../../services/emergencyAlert';
import { useAuth } from '../../context/AuthContext';

export default function EmergencyMapScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [pulseAnims] = useState({});

    useEffect(() => {
        // Get user's location
        const loadUserLocation = async () => {
            try {
                const location = await getCurrentLocation();
                setUserLocation(location);
            } catch (error) {
                console.error('Error getting location:', error);
            }
        };

        loadUserLocation();

        // Subscribe to emergency alerts
        const unsubscribe = subscribeToEmergencyAlerts((newAlerts) => {
            setAlerts(newAlerts);

            // Create pulse animations for new alerts
            newAlerts.forEach(alert => {
                if (!pulseAnims[alert.id]) {
                    pulseAnims[alert.id] = new Animated.Value(1);
                    startPulseAnimation(alert.id);
                }
            });
        });

        return () => unsubscribe();
    }, []);

    const startPulseAnimation = (alertId) => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnims[alertId], {
                    toValue: 1.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnims[alertId], {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const getMapRegion = () => {
        if (alerts.length === 0 && userLocation) {
            return {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
            };
        }

        if (alerts.length > 0) {
            // Center map on alerts
            const latitudes = alerts.map(a => a.latitude);
            const longitudes = alerts.map(a => a.longitude);

            const minLat = Math.min(...latitudes);
            const maxLat = Math.max(...latitudes);
            const minLng = Math.min(...longitudes);
            const maxLng = Math.max(...longitudes);

            return {
                latitude: (minLat + maxLat) / 2,
                longitude: (minLng + maxLng) / 2,
                latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.1),
                longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.1),
            };
        }

        // Default to Sri Lanka center
        return {
            latitude: 7.8731,
            longitude: 80.7718,
            latitudeDelta: 2,
            longitudeDelta: 2,
        };
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.surface} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Emergency Alerts</Text>
                    <View style={styles.alertCount}>
                        <Ionicons name="warning" size={16} color={Colors.surface} />
                        <Text style={styles.alertCountText}>{alerts.length} Active</Text>
                    </View>
                </View>
            </View>

            {/* Map */}
            <MapView
                style={styles.map}
                initialRegion={getMapRegion()}
                region={getMapRegion()}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {alerts.map((alert) => (
                    <Marker
                        key={alert.id}
                        coordinate={{
                            latitude: alert.latitude,
                            longitude: alert.longitude,
                        }}
                    >
                        <View style={styles.markerContainer}>
                            {/* Pulsating outer circle */}
                            <Animated.View
                                style={[
                                    styles.pulseCircle,
                                    {
                                        transform: [{ scale: pulseAnims[alert.id] || 1 }],
                                        opacity: pulseAnims[alert.id]?.interpolate({
                                            inputRange: [1, 1.3],
                                            outputRange: [0.6, 0],
                                        }) || 0.6,
                                    },
                                ]}
                            />

                            {/* Alert marker */}
                            <View style={styles.alertMarker}>
                                <Ionicons name="warning" size={28} color={Colors.surface} />
                            </View>

                            {/* Name label above marker */}
                            <View style={styles.nameLabel}>
                                <Text style={styles.emergencyText}>EMERGENCY</Text>
                                <Text style={styles.nameText}>{alert.userName}</Text>
                                <Text style={styles.timeLabel}>{getTimeSinceAlert(alert.timestamp)}</Text>
                            </View>
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Alert List */}
            {alerts.length > 0 ? (
                <ScrollView
                    style={styles.alertList}
                    contentContainerStyle={styles.alertListContent}
                    showsVerticalScrollIndicator={false}
                >
                    {alerts.map((alert) => (
                        <View key={alert.id} style={styles.alertCard}>
                            <View style={styles.alertIcon}>
                                <Ionicons name="warning" size={24} color={Colors.danger} />
                            </View>
                            <View style={styles.alertInfo}>
                                <Text style={styles.alertName}>{alert.userName}</Text>
                                <Text style={styles.alertTime}>{getTimeSinceAlert(alert.timestamp)}</Text>
                                <Text style={styles.alertLocation}>
                                    {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.navigateButton}
                                onPress={() => {
                                    // Could integrate with maps navigation here
                                }}
                            >
                                <Ionicons name="navigate" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.noAlertsContainer}>
                    <Ionicons name="shield-checkmark" size={64} color={Colors.success} />
                    <Text style={styles.noAlertsText}>No Active Emergencies</Text>
                    <Text style={styles.noAlertsSubtext}>All clear in your area</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        backgroundColor: Colors.danger,
        paddingTop: 60,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: 4,
    },
    alertCount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    alertCountText: {
        fontSize: 14,
        color: Colors.surface,
        fontWeight: '600',
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseCircle: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.danger,
    },
    alertMarker: {
        width: 56,
        height: 56,
        borderRadius: 28,
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
    nameLabel: {
        position: 'absolute',
        bottom: 70,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        minWidth: 120,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 2,
        borderColor: Colors.danger,
    },
    emergencyText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.danger,
        letterSpacing: 1,
    },
    nameText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 2,
    },
    timeLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    alertList: {
        maxHeight: 200,
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
    },
    alertListContent: {
        padding: Spacing.md,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
        borderLeftWidth: 4,
        borderLeftColor: Colors.danger,
    },
    alertIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.danger + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    alertInfo: {
        flex: 1,
    },
    alertName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    alertTime: {
        fontSize: 12,
        color: Colors.danger,
        fontWeight: '600',
        marginTop: 2,
    },
    alertLocation: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    navigateButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noAlertsContainer: {
        backgroundColor: Colors.surface,
        padding: Spacing.xl * 2,
        alignItems: 'center',
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
    },
    noAlertsText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: Spacing.md,
    },
    noAlertsSubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
});