import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const itinerariesQuery = query(
                collection(db, 'itineraries'),
                where('userId', '==', userProfile.uid || 'temp')
            );
            const itinerariesSnapshot = await getDocs(itinerariesQuery);

            setStats({
                totalItineraries: itinerariesSnapshot.size,
                savedAttractions: 0, 
                riskChecks: 0, 
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    // Helper to navigate
    const handleNavigation = (path) => {
        router.push(path);
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
                    {/* Make the greeting clickable to go to Profile */}
                    <TouchableOpacity onPress={() => handleNavigation('/(tourist)/profile')}>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.userName}>{userProfile?.name || 'Traveler'}!</Text>
                    </TouchableOpacity>
                    
                    <View style={{flexDirection: 'row', gap: 15}}>
                        {/* Added Profile Icon explicitly here since it's not in the tab bar */}
                        <TouchableOpacity onPress={() => handleNavigation('/(tourist)/profile')}>
                            <Ionicons name="person-circle-outline" size={32} color={Colors.surface} />
                        </TouchableOpacity>

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
                        <Ionicons name="map-outline" size={24} color={Colors.primary} />
                        <Text style={styles.statNumber}>{stats.totalItineraries}</Text>
                        <Text style={styles.statLabel}>Trips</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="heart-outline" size={24} color={Colors.danger} />
                        <Text style={styles.statNumber}>{stats.savedAttractions}</Text>
                        <Text style={styles.statLabel}>Favorites</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={Colors.success} />
                        <Text style={styles.statNumber}>{stats.riskChecks}</Text>
                        <Text style={styles.statLabel}>Safety</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Main Action Cards */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: Colors.primary }]}
                        onPress={() => handleNavigation('/(tourist)/itinerary')}
                    >
                        <LinearGradient
                            colors={[Colors.primary, Colors.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.actionCardGradient}
                        >
                            <View style={styles.actionCardContent}>
                                <View>
                                    <Text style={styles.actionCardTitle}>Plan Your Trip</Text>
                                    <Text style={styles.actionCardSubtitle}>
                                        Generate personalized itineraries
                                    </Text>
                                </View>
                                <Ionicons name="map" size={48} color={Colors.surface} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: Colors.danger }]}
                        onPress={() => handleNavigation('/(tourist)/risk')}
                    >
                        <LinearGradient
                            colors={[Colors.danger, Colors.warning]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.actionCardGradient}
                        >
                            <View style={styles.actionCardContent}>
                                <View>
                                    <Text style={styles.actionCardTitle}>Check Safety</Text>
                                    <Text style={styles.actionCardSubtitle}>
                                        View real-time risk zones
                                    </Text>
                                </View>
                                <Ionicons name="alert-circle" size={48} color={Colors.surface} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Navigation Buttons for Place and Culture (Alternative to Tabs) */}
                    <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                         <TouchableOpacity
                            style={{flex: 1, backgroundColor: Colors.surface, padding: 15, borderRadius: 10, alignItems: 'center', elevation: 2}}
                            onPress={() => handleNavigation('/(tourist)/place')}
                        >
                            <Ionicons name="location" size={24} color={Colors.primary} />
                            <Text style={{fontWeight: 'bold', marginTop: 5, color: Colors.text}}>Places</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{flex: 1, backgroundColor: Colors.surface, padding: 15, borderRadius: 10, alignItems: 'center', elevation: 2}}
                            onPress={() => handleNavigation('/(tourist)/culture')}
                        >
                            <Ionicons name="people" size={24} color={Colors.primary} />
                            <Text style={{fontWeight: 'bold', marginTop: 5, color: Colors.text}}>Culture</Text>
                        </TouchableOpacity>
                    </View>

                </View>

                {/* Featured Destinations */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Featured Destinations</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All →</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.destinationsScroll}
                    >
                        {featuredDestinations.map((destination) => (
                            <TouchableOpacity key={destination.id} style={styles.destinationCard}>
                                <Image
                                    source={{ uri: destination.image }}
                                    style={styles.destinationImage}
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                                    style={styles.destinationGradient}
                                >
                                    <View style={styles.destinationInfo}>
                                        <Text style={styles.destinationName}>{destination.name}</Text>
                                        <View style={styles.destinationMeta}>
                                            <View style={styles.categoryBadge}>
                                                <Text style={styles.categoryText}>{destination.category}</Text>
                                            </View>
                                            <View style={styles.ratingContainer}>
                                                <Ionicons name="star" size={14} color={Colors.warning} />
                                                <Text style={styles.ratingText}>{destination.rating}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
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
        fontSize: 10,
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: Spacing.xs,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Spacing.xl * 2,
    },
    section: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
    },
    seeAllText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
    },
    actionCard: {
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    actionCardGradient: {
        padding: Spacing.lg,
    },
    actionCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionCardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: Spacing.xs,
    },
    actionCardSubtitle: {
        fontSize: 14,
        color: Colors.surface,
        opacity: 0.9,
    },
    destinationsScroll: {
        gap: Spacing.md,
    },
    destinationCard: {
        width: width * 0.7,
        height: 200,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
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
        height: '50%',
        justifyContent: 'flex-end',
        padding: Spacing.md,
    },
    destinationInfo: {
        gap: Spacing.xs,
    },
    destinationName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.surface,
    },
    destinationMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    categoryBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    categoryText: {
        fontSize: 12,
        color: Colors.surface,
        fontWeight: '600',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        color: Colors.surface,
        fontWeight: '600',
    },
});