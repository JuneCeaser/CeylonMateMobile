import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';

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

    // Reload data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [userProfile])
    );

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
                    <TouchableOpacity style={styles.notificationButton}>
                        <Ionicons name="notifications-outline" size={28} color={Colors.surface} />
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>2</Text>
                        </View>
                    </TouchableOpacity>
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
});