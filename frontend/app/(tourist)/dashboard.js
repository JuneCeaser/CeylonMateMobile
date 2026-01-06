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

    /**
     * Mock Data for Personalized Recommendations from Culture Hub
     */
    const [recommendations, setRecommendations] = useState([
        { 
            _id: '1', 
            title: 'Batik Making', 
            matchScore: 98, 
            category: 'Tradition', 
            location: 'Kaluthara',
            images: ['https://gpjs3bucket.s3.amazonaws.com/wp-content/uploads/2023/06/29131355/02_GPJNews_SriLanka_TI_BatikIndustry_065_L_web.jpg'] 
        },
        { 
            _id: '2', 
            title: 'Traditinal Dancing Experience', 
            matchScore: 88, 
            category: 'Dancing', 
            location: 'Kaluthara',
            images: ['https://farm6.staticflickr.com/5817/21849643503_114cee4a38_o.png'] 
        },
        
    ]);

    useEffect(() => {
        loadStats();
    }, []);

    /**
     * Fetch user-specific statistics from Firebase Firestore
     */
    const loadStats = async () => {
        try {
            const itinerariesQuery = query(
                collection(db, 'itineraries'),
                where('userId', '==', userProfile?.uid || 'temp')
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

    const handleNavigation = (path) => {
        router.push(path);
    };

    /**
     * Featured Sri Lankan destinations
     */
    const featuredDestinations = [
        { id: 1, name: 'Sigiriya Rock', category: 'Historical', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', rating: 4.8 },
        { id: 2, name: 'Mirissa Beach', category: 'Beach', image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', rating: 4.9 },
        { id: 3, name: 'Yala National Park', category: 'Wildlife', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800', rating: 4.7 },
    ];

    return (
        <View style={styles.container}>
            {/* --- TOP HEADER WITH STATS --- */}
            <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => handleNavigation('/(tourist)/profile')}>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.userName}>{userProfile?.name || 'Traveler'}!</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.headerIcons}>
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

                {/* Dashboard statistics summary cards */}
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
                {/* --- VOICE HUB PROMO --- */}
                <View style={styles.section}>
                    <TouchableOpacity 
                        style={styles.aiPromoCard} 
                        onPress={() => handleNavigation('/(tourist)/culture')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient 
                            colors={['#2E7D32', '#F57C00']} 
                            start={{ x: 0, y: 0 }} 
                            end={{ x: 1, y: 1 }} 
                            style={styles.aiPromoGradient}
                        >
                            <View style={styles.aiPromoContent}>
                                <View style={styles.aiTextWrapper}>
                                    <View style={styles.aiLiveBadge}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>VOICE MODE ON</Text>
                                    </View>
                                    <Text style={styles.aiPromoTitle}>Explore Culture Hub</Text>
                                    <Text style={styles.aiPromoDesc}>
                                        Discover stories and traditions through simple voice prompts.
                                    </Text>
                                </View>
                                <View style={styles.aiIconCircle}>
                                    <Ionicons name="mic" size={28} color="#FFF" />
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* --- CULTURAL HUB RECOMMENDATIONS --- */}
                {recommendations.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Picked For You</Text>
                            <TouchableOpacity><Text style={styles.seeAllText}>View All</Text></TouchableOpacity>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationScroll}>
                            {recommendations.map((exp) => (
                                <TouchableOpacity 
                                    key={exp._id} 
                                    style={styles.cuteCard}
                                    onPress={() => router.push(`/(tourist)/place/${exp._id}`)}
                                >
                                    <Image source={{ uri: exp.images[0] }} style={styles.cuteImage} />
                                    
                                    {/* Highlighted Match Percentage Tag */}
                                    <View style={styles.matchTag}>
                                        <Text style={styles.matchTagText}>{exp.matchScore}% Match</Text>
                                    </View>

                                    <View style={styles.cuteContent}>
                                        <Text style={styles.cuteTitle} numberOfLines={1}>{exp.title}</Text>
                                        <View style={styles.cuteMeta}>
                                            <Ionicons name="location-sharp" size={12} color={Colors.primary} />
                                            <Text style={styles.cuteLocation}>{exp.location}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* --- QUICK ACTION NAVIGATION --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation('/(tourist)/itinerary')}>
                        <LinearGradient colors={[Colors.primary, Colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionCardGradient}>
                            <View style={styles.actionCardContent}>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.actionCardTitle}>Plan Your Trip</Text>
                                    <Text style={styles.actionCardSubtitle}>Generate personalized itineraries</Text>
                                </View>
                                <Ionicons name="map" size={40} color={Colors.surface} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation('/(tourist)/culture')}>
                        <LinearGradient colors={['#1B5E20', '#4CAF50']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionCardGradient}>
                            <View style={styles.actionCardContent}>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.actionCardTitle}>Discover Culture</Text>
                                    <Text style={styles.actionCardSubtitle}>Explore local traditions</Text>
                                </View>
                                <Ionicons name="people" size={40} color={Colors.surface} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation('/(tourist)/risk')}>
                        <LinearGradient colors={[Colors.danger, Colors.warning]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionCardGradient}>
                            <View style={styles.actionCardContent}>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.actionCardTitle}>Check Safety</Text>
                                    <Text style={styles.actionCardSubtitle}>Real-time risk zones</Text>
                                </View>
                                <Ionicons name="alert-circle" size={40} color={Colors.surface} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.placesButton} onPress={() => handleNavigation('/(tourist)/place')}>
                        <Ionicons name="location" size={24} color={Colors.primary} />
                        <Text style={styles.placesButtonText}>Explore Places</Text>
                    </TouchableOpacity>
                </View>

                {/* --- POPULAR DESTINATIONS --- */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Featured Destinations</Text>
                        <TouchableOpacity><Text style={styles.seeAllText}>See All →</Text></TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationsScroll}>
                        {featuredDestinations.map((destination) => (
                            <TouchableOpacity key={destination.id} style={styles.destinationCard}>
                                <Image source={{ uri: destination.image }} style={styles.destinationImage} />
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.destinationGradient}>
                                    <View style={styles.destinationInfo}>
                                        <Text style={styles.destinationName}>{destination.name}</Text>
                                        <View style={styles.ratingContainer}>
                                            <Ionicons name="star" size={14} color={Colors.warning} />
                                            <Text style={styles.ratingText}>{destination.rating}</Text>
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
    container: { flex: 1, backgroundColor: Colors.background },
    content: { flex: 1 },
    scrollContent: { paddingBottom: Spacing.xl * 2 },
    section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },

    // Header Styles
    header: { paddingTop: 60, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    headerIcons: { flexDirection: 'row', gap: 15 },
    greeting: { fontSize: 14, color: Colors.surface, opacity: 0.9 },
    userName: { fontSize: 24, fontWeight: 'bold', color: Colors.surface },
    notificationButton: { position: 'relative' },
    notificationBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: Colors.danger, borderRadius: 10, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
    notificationBadgeText: { color: Colors.surface, fontSize: 8, fontWeight: 'bold' },

    // Top Stats
    statsContainer: { flexDirection: 'row', gap: Spacing.sm },
    statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', elevation: 2 },
    statNumber: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginTop: 4 },
    statLabel: { fontSize: 11, color: Colors.textSecondary },

    // Voice Hub Card
    aiPromoCard: { borderRadius: 16, overflow: 'hidden', elevation: 5, marginTop: 5 },
    aiPromoGradient: { padding: 18 },
    aiPromoContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    aiTextWrapper: { flex: 1 },
    aiLiveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6, gap: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF00' },
    liveText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
    aiPromoTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
    aiPromoDesc: { fontSize: 12, color: 'rgba(255, 255, 255, 0.95)', marginTop: 4 },
    aiIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },

    // Recommendation Cards
    recommendationScroll: { paddingRight: 20 },
    cuteCard: { 
        width: 150, 
        backgroundColor: Colors.surface, 
        borderRadius: 16, 
        marginRight: 8, 
        elevation: 3, 
        overflow: 'hidden', 
        marginBottom: 5 
    },
    cuteImage: { width: '100%', height: 90 },
    cuteContent: { padding: 8 },
    cuteTitle: { fontSize: 13, fontWeight: 'bold', color: Colors.text },
    cuteMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
    cuteLocation: { fontSize: 10, color: Colors.textSecondary },

    // --- HIGHLIGHTED MATCH PERCENTAGE STYLE ---
    matchTag: { 
        position: 'absolute', 
        top: 6, 
        right: 6, 
        backgroundColor: Colors.success, // Bold green background
        paddingHorizontal: 8, 
        paddingVertical: 3, 
        borderRadius: 10,
        elevation: 4, // Shadow for prominence
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    matchTagText: { 
        fontSize: 10, 
        fontWeight: '900', // Heavy bold
        color: Colors.surface // White text
    },

    // Action Cards
    actionCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden', elevation: 3 },
    actionCardGradient: { padding: 16 },
    actionCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionTextContainer: { flex: 1 },
    actionCardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.surface },
    actionCardSubtitle: { fontSize: 12, color: Colors.surface, opacity: 0.8 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    seeAllText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

    placesButton: { backgroundColor: Colors.surface, padding: 18, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2, gap: 10, marginTop: 10 },
    placesButtonText: { fontWeight: 'bold', color: Colors.text, fontSize: 16 },

    destinationsScroll: { gap: Spacing.md },
    destinationCard: { width: width * 0.7, height: 200, borderRadius: BorderRadius.lg, overflow: 'hidden', elevation: 4 },
    destinationImage: { width: '100%', height: '100%' },
    destinationGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', justifyContent: 'flex-end', padding: Spacing.md },
    destinationInfo: { gap: Spacing.xs },
    destinationName: { fontSize: 18, fontWeight: 'bold', color: Colors.surface },
    destinationMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    categoryBadge: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
    categoryText: { fontSize: 12, color: Colors.surface, fontWeight: '600' },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 12, color: Colors.surface, fontWeight: '600' },
});