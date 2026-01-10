import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
    triggerEmergencyAlert,
    subscribeToEmergencyAlerts,
    getUserActiveAlert,
    requestLocationPermission
} from '../../services/emergencyAlert';


const { width } = Dimensions.get('window');

export default function TouristDashboard() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const [stats, setStats] = useState({
        totalItineraries: 0,
        savedAttractions: 0,
        riskChecks: 0,
    });
    const [recentItineraries, setRecentItineraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [emergencyAlerts, setEmergencyAlerts] = useState([]);
    const [userActiveAlert, setUserActiveAlert] = useState(null);
    const [showAlertIndicator, setShowAlertIndicator] = useState(false);

    // Reload data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [userProfile])
    );

    // ADD this useEffect to monitor alerts:
    useEffect(() => {
        // Request location permission on mount
        requestLocationPermission();

        // Subscribe to emergency alerts
        const unsubscribe = subscribeToEmergencyAlerts((alerts) => {
            setEmergencyAlerts(alerts);

            // Check if current user has an active alert
            const userAlert = getUserActiveAlert(alerts, userProfile?.uid);
            setUserActiveAlert(userAlert);

            // Show indicator if there are OTHER users' alerts (not the current user's)
            const otherAlerts = alerts.filter(a => a.userId !== userProfile?.uid);
            setShowAlertIndicator(otherAlerts.length > 0);

            // Auto-open map if new alert from ANOTHER user
            if (otherAlerts.length > 0 && !userAlert) {
                // Only auto-open if user doesn't already have their own alert active
                const hasNewAlert = otherAlerts.some(alert => {
                    const alertTime = new Date(alert.timestamp);
                    const now = new Date();
                    return (now - alertTime) < 5000; // Alert less than 5 seconds old
                });

                if (hasNewAlert) {
                    router.push('/(tourist)/emergency-map');
                }
            }
        });

        return () => unsubscribe();
    }, [userProfile]);

    // ADD this function to handle SOS button:
    const handleEmergencyAlert = () => {
        Alert.alert(
            'Emergency Alert',
            'Send emergency alert to all nearby users? Your location will be shared.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Alert',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const alert = await triggerEmergencyAlert(
                                userProfile?.uid,
                                userProfile?.name || 'Tourist'
                            );

                            console.log('Alert triggered:', alert); // Debug log

                            // Navigate to emergency alert screen
                            router.push({
                                pathname: '/(tourist)/emergency-alert',
                                params: {
                                    alertData: JSON.stringify(alert),
                                    alertId: alert.alertId, // CRITICAL: Pass alertId separately
                                },
                            });
                        } catch (error) {
                            console.error('Trigger error:', error);
                            Alert.alert(
                                'Error',
                                'Failed to send emergency alert. Please check location permissions.'
                            );
                        }
                    },
                },
            ]
        );
    };


    // Replace the loadDashboardData function in dashboard.js

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Load itineraries WITHOUT orderBy to avoid index requirement
            const itinerariesQuery = query(
                collection(db, 'itineraries'),
                where('userId', '==', userProfile?.uid || 'temp')
            );
            const itinerariesSnapshot = await getDocs(itinerariesQuery);

            const itineraries = itinerariesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Sort on the client side instead of in Firestore
            const sortedItineraries = itineraries.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            // Take only the 5 most recent
            setRecentItineraries(sortedItineraries.slice(0, 5));
            setStats({
                totalItineraries: itinerariesSnapshot.size,
                savedAttractions: 0,
                riskChecks: 0,
            });

            setLoading(false);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setLoading(false);
        }
    };

    const viewItinerary = (itinerary) => {
        // Navigate to itinerary results with the saved data
        router.push({
            pathname: '/(tourist)/itinerary-results',
            params: {
                ...itinerary,
                // Convert arrays to strings for URL params
                attractions: JSON.stringify(itinerary.selectedAttractions || itinerary.attractions || []),
            },
        });
    };

    const featuredDestinations = [
        {
            id: 1,
            name: 'Sigiriya Rock',
            category: 'Historical',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            rating: 4.8,
        },
        {
            id: 2,
            name: 'Mirissa Beach',
            category: 'Beach',
            image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
            rating: 4.9,
        },
        {
            id: 3,
            name: 'Yala National Park',
            category: 'Wildlife',
            image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
            rating: 4.7,
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[Colors.primary, Colors.accent]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
    <View>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{userProfile?.name || 'Traveler'}!</Text>
    </View>

    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        
        {/* Profile Button */}
        <TouchableOpacity
            onPress={() => router.push('/(tourist)/profile')}
            style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.3)',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Ionicons name="person" size={22} color={Colors.surface} />
        </TouchableOpacity>

        {/* Notifications (your old button) */}
        <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={28} color={Colors.surface} />
            <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>2</Text>
            </View>
        </TouchableOpacity>

    </View>
</View>


                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Ionicons name="map-outline" size={24} color={Colors.surface} />
                        <Text style={styles.statValue}>{stats.totalItineraries}</Text>
                        <Text style={styles.statLabel}>Trips</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="location-outline" size={24} color={Colors.surface} />
                        <Text style={styles.statValue}>{stats.savedAttractions}</Text>
                        <Text style={styles.statLabel}>Saved</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={Colors.surface} />
                        <Text style={styles.statValue}>{stats.riskChecks}</Text>
                        <Text style={styles.statLabel}>Checked</Text>
                    </View>
                </View>
            </LinearGradient>

            {/*ADD this JSX after the header and before the ScrollView:*/}

            {/* Emergency Alert Indicator - show if there are active alerts from other users */}
            {showAlertIndicator && (
                <TouchableOpacity
                    style={styles.emergencyIndicator}
                    onPress={() => router.push('/(tourist)/emergency-map')}
                >
                    <Ionicons name="warning" size={20} color={Colors.surface} />
                    <Text style={styles.emergencyIndicatorText}>
                        {emergencyAlerts.filter(a => a.userId !== userProfile?.uid).length} Emergency Alert(s) Active
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.surface} />
                </TouchableOpacity>
            )}


            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >


                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/(tourist)/itinerary')}
                        >
                            <LinearGradient
                                colors={[Colors.primary, Colors.accent]}
                                style={styles.actionGradient}
                            >
                                <Ionicons name="add-circle" size={32} color={Colors.surface} />
                                <Text style={styles.actionText}>Plan Trip</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/(tourist)/risk')}
                        >
                            <LinearGradient
                                colors={[Colors.danger, Colors.warning]}
                                style={styles.actionGradient}
                            >
                                <Ionicons name="shield-checkmark" size={32} color={Colors.surface} />
                                <Text style={styles.actionText}>Check Safety</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>



                {/* Featured Destinations */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Featured Destinations</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.destinationsScroll}
                    >
                        {featuredDestinations.map((destination) => (
                            <View key={destination.id} style={styles.destinationCard}>
                                <Image
                                    source={{ uri: destination.image }}
                                    style={styles.destinationImage}
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                                    style={styles.destinationGradient}
                                >
                                    <View style={styles.destinationBadge}>
                                        <Text style={styles.destinationCategory}>{destination.category}</Text>
                                    </View>
                                    <Text style={styles.destinationName}>{destination.name}</Text>
                                    <View style={styles.destinationRating}>
                                        <Ionicons name="star" size={16} color={Colors.secondary} />
                                        <Text style={styles.ratingText}>{destination.rating}</Text>
                                    </View>
                                </LinearGradient>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* My Itineraries Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>My Itineraries</Text>
                        {recentItineraries.length > 0 && (
                            <TouchableOpacity>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                        </View>
                    ) : recentItineraries.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="map-outline" size={64} color={Colors.textSecondary} />
                            <Text style={styles.emptyStateText}>No itineraries yet</Text>
                            <Text style={styles.emptyStateSubtext}>
                                Start planning your perfect trip!
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyStateButton}
                                onPress={() => router.push('/(tourist)/itinerary')}
                            >
                                <Text style={styles.emptyStateButtonText}>Plan a Trip</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {recentItineraries.map((itinerary) => (
                                <TouchableOpacity
                                    key={itinerary.id}
                                    style={styles.itineraryCard}
                                    onPress={() => viewItinerary(itinerary)}
                                >
                                    <View style={styles.itineraryHeader}>
                                        <View style={styles.itineraryIcon}>
                                            <Ionicons name="map" size={24} color={Colors.primary} />
                                        </View>
                                        <View style={styles.itineraryInfo}>
                                            <Text style={styles.itineraryTitle}>
                                                {itinerary.activityType?.toUpperCase()} Trip
                                            </Text>
                                            <Text style={styles.itinerarySubtitle}>
                                                {new Date(itinerary.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                                    </View>
                                    <View style={styles.itineraryDetails}>
                                        <View style={styles.itineraryDetail}>
                                            <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                                            <Text style={styles.itineraryDetailText}>
                                                {itinerary.availableDays} days
                                            </Text>
                                        </View>
                                        <View style={styles.itineraryDetail}>
                                            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                                            <Text style={styles.itineraryDetailText}>
                                                {(itinerary.selectedAttractions || itinerary.attractions || []).length} places
                                            </Text>
                                        </View>
                                        <View style={styles.itineraryDetail}>
                                            <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                                            <Text style={styles.itineraryDetailText}>
                                                {(itinerary.estimatedBudget / 1000).toFixed(0)}K LKR
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Emergency SOS Button */}
                <TouchableOpacity
                    style={styles.sosButton}
                    onPress={handleEmergencyAlert}
                >
                    <View style={styles.sosIconContainer}>
                        <Ionicons name="warning" size={32} color={Colors.surface} />
                    </View>
                    <View style={styles.sosTextContainer}>
                        <Text style={styles.sosTitle}>Emergency SOS</Text>
                        <Text style={styles.sosSubtitle}>Alert nearby users & emergency contacts</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={Colors.surface} />
                </TouchableOpacity>

                {/* If user has active alert, show view alert button */}
                {userActiveAlert && (
                    <TouchableOpacity
                        style={styles.activeAlertButton}
                        onPress={() => {
                            router.push({
                                pathname: '/(tourist)/emergency-alert',
                                params: {
                                    alertData: JSON.stringify(userActiveAlert),
                                    alertId: userActiveAlert.id, // CRITICAL: Pass alertId separately
                                },
                            });
                        }}
                    >
                        <View style={styles.pulseIndicator} />
                        <Text style={styles.activeAlertText}>Your Emergency Alert is Active</Text>
                        <Ionicons name="arrow-forward" size={20} color={Colors.surface} />
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    greeting: {
        fontSize: 16,
        color: Colors.surface,
        opacity: 0.9,
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.surface,
    },
    notificationButton: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.danger,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadgeText: {
        color: Colors.surface,
        fontSize: 12,
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.surface,
        marginTop: Spacing.xs,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.surface,
        opacity: 0.9,
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    seeAllText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    loadingContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyState: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginTop: Spacing.md,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
        textAlign: 'center',
    },
    emptyStateButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
    },
    emptyStateButtonText: {
        color: Colors.surface,
        fontSize: 14,
        fontWeight: 'bold',
    },
    itineraryCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    itineraryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    itineraryIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    itineraryInfo: {
        flex: 1,
    },
    itineraryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 2,
    },
    itinerarySubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    itineraryDetails: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.xs,
    },
    itineraryDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    itineraryDetailText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionCard: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    actionGradient: {
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    actionText: {
        color: Colors.surface,
        fontSize: 14,
        fontWeight: 'bold',
    },
    destinationsScroll: {
        gap: Spacing.md,
    },
    destinationCard: {
        width: width * 0.7,
        height: 200,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    destinationImage: {
        width: '100%',
        height: '100%',
    },
    destinationGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Spacing.md,
        justifyContent: 'flex-end',
    },
    destinationBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        marginBottom: Spacing.xs,
    },
    destinationCategory: {
        color: Colors.surface,
        fontSize: 10,
        fontWeight: 'bold',
    },
    destinationName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: 4,
    },
    destinationRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        color: Colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },

    // ADD these styles:
    emergencyIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.danger,
        marginHorizontal: Spacing.lg,
        marginTop: -Spacing.md, // Pull up under header
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        gap: Spacing.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    emergencyIndicatorText: {
        flex: 1,
        color: Colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    sosButton: {
        transform: [{ translateY: -20 }],
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.danger,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        shadowColor: Colors.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    sosIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    sosTextContainer: {
        flex: 1,
    },
    sosTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: 2,
    },
    sosSubtitle: {
        fontSize: 12,
        color: Colors.surface,
        opacity: 0.9,
    },
    activeAlertButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6B00',
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    pulseIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.surface,
        shadowColor: Colors.surface,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },
    activeAlertText: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.surface,
    },
});