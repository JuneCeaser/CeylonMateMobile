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

    const featuredDestinations = [
        { id: 1, name: 'Sigiriya Rock', category: 'Historical', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', rating: 4.8 },
        { id: 2, name: 'Mirissa Beach', category: 'Beach', image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', rating: 4.9 },
        { id: 3, name: 'Yala National Park', category: 'Wildlife', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800', rating: 4.7 },
    ];

    return (
        <View style={styles.container}>
            {/* --- HEADER --- */}
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

                {/* Stats Row */}
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
                {/* --- NEW: AI VOICE ASSISTANT HIGHLIGHT (ORANGE THEME) --- */}
                <View style={styles.section}>
                    <TouchableOpacity 
                        style={styles.aiPromoCard} 
                        onPress={() => handleNavigation('/(tourist)/culture')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient 
                            colors={['#F57C00', '#E65100']} 
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
                                    <Text style={styles.aiPromoTitle}>Explore Culture Hub with Voice</Text>
                                    <Text style={styles.aiPromoDesc}>
                                        Discover stories, traditions, and insights inside the Culture Hub through simple voice prompts..
                                    </Text>
                                </View>
                                <View style={styles.aiIconCircle}>
                                    <Ionicons name="mic" size={32} color="#FFF" />
                                    <View style={styles.glowRing} />
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* --- QUICK ACTIONS --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation('/(tourist)/itinerary')}>
                        <LinearGradient colors={[Colors.primary, Colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionCardGradient}>
                            <View style={styles.actionCardContent}>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.actionCardTitle}>Plan Your Trip</Text>
                                    <Text style={styles.actionCardSubtitle}>Generate personalized itineraries</Text>
                                </View>
                                <Ionicons name="map" size={48} color={Colors.surface} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation('/(tourist)/culture')}>
                        <LinearGradient colors={['#1B5E20', '#4CAF50']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionCardGradient}>
                            <View style={styles.actionCardContent}>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.actionCardTitle}>Discover Culture</Text>
                                    <Text style={styles.actionCardSubtitle}>Explore authentic local traditions</Text>
                                </View>
                                <Ionicons name="people" size={48} color={Colors.surface} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation('/(tourist)/risk')}>
                        <LinearGradient colors={[Colors.danger, Colors.warning]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionCardGradient}>
                            <View style={styles.actionCardContent}>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.actionCardTitle}>Check Safety</Text>
                                    <Text style={styles.actionCardSubtitle}>View real-time risk zones</Text>
                                </View>
                                <Ionicons name="alert-circle" size={48} color={Colors.surface} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.placesButton} onPress={() => handleNavigation('/(tourist)/place')}>
                        <Ionicons name="location" size={24} color={Colors.primary} />
                        <Text style={styles.placesButtonText}>Explore Places</Text>
                    </TouchableOpacity>
                </View>

                {/* --- FEATURED DESTINATIONS --- */}
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
    container: { flex: 1, backgroundColor: Colors.background },
    content: { flex: 1 },
    scrollContent: { paddingBottom: Spacing.xl * 2 },
    section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },

    // Header Styles
    header: { paddingTop: 60, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    headerIcons: { flexDirection: 'row', gap: 15 },
    greeting: { fontSize: 16, color: Colors.surface, opacity: 0.9 },
    userName: { fontSize: 28, fontWeight: 'bold', color: Colors.surface },
    notificationButton: { position: 'relative' },
    notificationBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.danger, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    notificationBadgeText: { color: Colors.surface, fontSize: 10, fontWeight: 'bold' },

    // Stats Styles
    statsContainer: { flexDirection: 'row', gap: Spacing.sm },
    statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', elevation: 2 },
    statNumber: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginTop: Spacing.xs },
    statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

    // AI PROMO CARD STYLES (#F57C00)
    aiPromoCard: { 
        borderRadius: 20, 
        overflow: 'hidden', 
        elevation: 8, 
        shadowColor: '#F57C00', 
        shadowOpacity: 0.4, 
        shadowRadius: 12 
    },
    aiPromoGradient: { padding: 22 },
    aiPromoContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    aiTextWrapper: { flex: 1, marginRight: 12 },
    aiLiveBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.15)', 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 12, 
        alignSelf: 'flex-start', 
        marginBottom: 8, 
        gap: 6 
    },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF00' },
    liveText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    aiPromoTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
    aiPromoDesc: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 20 },
    aiIconCircle: { 
        width: 64, 
        height: 64, 
        borderRadius: 32, 
        backgroundColor: 'rgba(255, 255, 255, 0.25)', 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1.5, 
        borderColor: 'rgba(255, 255, 255, 0.4)' 
    },
    glowRing: { position: 'absolute', width: 75, height: 75, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },

    // Action Cards
    actionCard: { borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden', elevation: 4 },
    actionCardGradient: { padding: Spacing.lg },
    actionCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionTextContainer: { flex: 1, marginRight: 15 },
    actionCardTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.surface, marginBottom: Spacing.xs },
    actionCardSubtitle: { fontSize: 14, color: Colors.surface, opacity: 0.9 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitle: { ...Typography.h3, color: Colors.text },
    seeAllText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

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