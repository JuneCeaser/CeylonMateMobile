import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ConditionalMapView, ConditionalMarker } from '../../components/MapWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { loadAttractions } from '../../services/csvDataLoader';
import { findBestHotels, generateItineraryName } from '../../services/hotelData';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';


const { width, height } = Dimensions.get('window');

export default function ItineraryResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [attractions, setAttractions] = useState([]);
    const [selectedHotels, setSelectedHotels] = useState([]);
    const [itineraryName, setItineraryName] = useState('');
    const [recommendations, setRecommendations] = useState([]);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [estimatedBudget, setEstimatedBudget] = useState(0);
    const [showMap, setShowMap] = useState(false);
    const [selectedAttraction, setSelectedAttraction] = useState(null);

    useEffect(() => {
        generateItinerary();
    }, []);

    const generateItinerary = async () => {
        try {
            setLoading(true);

            // Load attractions from CSV
            const allAttractions = await loadAttractions();

            // Parse activity types (now an array)
            const activityTypesArray = params.activityTypes
                ? JSON.parse(params.activityTypes)
                : [params.activityType]; // Fallback for single type

            // Simple scoring algorithm with multiple activity types
            const scoredAttractions = allAttractions.map(attraction => {
                let score = 0;

                // Activity type match - check if matches ANY selected type
                const attrCategory = (attraction.category || '').toLowerCase();
                const matchesType = activityTypesArray.some(type =>
                    attrCategory === type.toLowerCase()
                );

                if (matchesType) {
                    score += 0.35;
                }

                // Season match
                if (parseInt(attraction.best_season) === parseInt(params.season)) {
                    score += 0.20;
                }

                // Budget match
                const attractionCost = parseFloat(attraction.avg_cost || 0);
                const dailyBudget = parseFloat(params.budget) / parseFloat(params.availableDays);
                if (attractionCost <= dailyBudget * 0.3) {
                    score += 0.25;
                }

                // Popularity
                score += parseFloat(attraction.popularity_score || 0) * 0.20;

                // Add some randomness for variety
                score += Math.random() * 0.1;

                return {
                    ...attraction,
                    score: Math.min(score, 1),
                    probability: score,
                };
            });

            // Sort by score and take top recommendations
            const maxAttractions = Math.min(
                Math.floor(parseFloat(params.availableDays) * 2.5),
                12
            );

            const topRecommendations = scoredAttractions
                .sort((a, b) => b.score - a.score)
                .slice(0, maxAttractions);

            // Calculate estimates
            const totalTime = topRecommendations.reduce(
                (sum, attr) => sum + parseFloat(attr.avg_duration_hours || 2),
                0
            );

            const totalBudget = topRecommendations.reduce(
                (sum, attr) => sum + parseFloat(attr.avg_cost || 0),
                0
            );

            // **NEW: Find best hotels based on attractions**
            const recommendedHotels = findBestHotels(
                topRecommendations,
                parseInt(params.availableDays),
                parseFloat(params.budget)
            );

            // **NEW: Generate smart itinerary name**
            const name = generateItineraryName(activityTypesArray);

            setRecommendations(topRecommendations);
            setSelectedHotels(recommendedHotels);
            setItineraryName(name);
            setEstimatedTime(totalTime);
            setEstimatedBudget(totalBudget);
            setLoading(false);
        } catch (error) {
            console.error('Error generating itinerary:', error);
            Alert.alert('Error', 'Failed to generate itinerary. Please try again.');
            setLoading(false);
        }
    };

    const saveItinerary = async () => {
        try {
            const itineraryData = {
                userId: user?.uid,
                name: itineraryName, // **NEW**
                budget: parseFloat(params.budget),
                availableDays: parseFloat(params.availableDays),
                numTravelers: parseFloat(params.numTravelers),
                distancePreference: parseFloat(params.distancePreference),
                activityTypes: params.activityTypes
                    ? JSON.parse(params.activityTypes)
                    : [params.activityType], // **NEW: support both**
                season: parseFloat(params.season),
                startLocation: params.startLocation,
                selectedAttractions: recommendations.map(r => r.attraction_id),
                selectedHotels: selectedHotels.map(h => h.id), // **NEW**
                estimatedTime,
                estimatedBudget,
                createdAt: new Date().toISOString(),
            };

            await addDoc(collection(db, 'itineraries'), itineraryData);

            Alert.alert('Success', 'Itinerary saved successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error saving itinerary:', error);
            Alert.alert('Error', 'Failed to save itinerary. Please try again.');
        }
    };

    const checkSafety = () => {
        router.push({
            pathname: '/(tourist)/risk',
            params: {
                itineraryData: JSON.stringify({
                    attractions: recommendations,
                    ...params,
                }),
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Generating your perfect itinerary...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[Colors.primary, Colors.accent]}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.surface} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Your Itinerary</Text>
                    <TouchableOpacity onPress={() => setShowMap(!showMap)}>
                        <Ionicons
                            name={showMap ? 'list' : 'map'}
                            size={24}
                            color={Colors.surface}
                        />
                    </TouchableOpacity>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryCard}>
                        <Ionicons name="time-outline" size={20} color={Colors.primary} />
                        <Text style={styles.summaryValue}>{estimatedTime.toFixed(0)}h</Text>
                        <Text style={styles.summaryLabel}>Total Time</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Ionicons name="cash-outline" size={20} color={Colors.primary} />
                        <Text style={styles.summaryValue}>
                            {(estimatedBudget / 1000).toFixed(0)}K
                        </Text>
                        <Text style={styles.summaryLabel}>Est. Cost</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Ionicons name="location-outline" size={20} color={Colors.primary} />
                        <Text style={styles.summaryValue}>{recommendations.length}</Text>
                        <Text style={styles.summaryLabel}>Places</Text>
                    </View>
                </View>
            </LinearGradient>

            {showMap ? (
                <View style={styles.mapContainer}>
                    <ConditionalMapView
                        style={styles.map}
                        initialRegion={{
                            latitude: parseFloat(recommendations[0]?.latitude || 7.8731),
                            longitude: parseFloat(recommendations[0]?.longitude || 80.7718),
                            latitudeDelta: 2,
                            longitudeDelta: 2,
                        }}
                    >
                        {recommendations.map((attraction, index) => (
                            <ConditionalMarker
                                key={attraction.attraction_id}
                                coordinate={{
                                    latitude: parseFloat(attraction.latitude),
                                    longitude: parseFloat(attraction.longitude),
                                }}
                                title={attraction.name}
                                description={attraction.category}
                                pinColor={Colors.primary}
                                onPress={() => setSelectedAttraction(attraction)}
                            >
                                <View style={styles.markerContainer}>
                                    <View style={styles.marker}>
                                        <Text style={styles.markerText}>{index + 1}</Text>
                                    </View>
                                </View>
                            </ConditionalMarker>
                        ))}
                    </ConditionalMapView>

                    {selectedAttraction && (
                        <View style={styles.mapInfoCard}>
                            <TouchableOpacity
                                style={styles.closeMapInfo}
                                onPress={() => setSelectedAttraction(null)}
                            >
                                <Ionicons name="close" size={20} color={Colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.mapInfoName}>{selectedAttraction.name}</Text>
                            <Text style={styles.mapInfoCategory}>{selectedAttraction.category}</Text>
                            <View style={styles.mapInfoDetails}>
                                <View style={styles.mapInfoItem}>
                                    <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                                    <Text style={styles.mapInfoText}>
                                        LKR {parseFloat(selectedAttraction.avg_cost).toFixed(0)}
                                    </Text>
                                </View>
                                <View style={styles.mapInfoItem}>
                                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                                    <Text style={styles.mapInfoText}>
                                        {parseFloat(selectedAttraction.avg_duration_hours).toFixed(1)}h
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Recommendations List */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recommended Attractions</Text>

                        {recommendations.map((attraction, index) => (
                            <TouchableOpacity
                                key={attraction.attraction_id}
                                style={styles.attractionCard}
                                onPress={() => setSelectedAttraction(attraction)}
                            >
                                <View style={styles.attractionNumber}>
                                    <Text style={styles.attractionNumberText}>{index + 1}</Text>
                                </View>

                                <Image
                                    source={{
                                        uri: attraction.image_url ||
                                            'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400',
                                    }}
                                    style={styles.attractionImage}
                                />

                                <View style={styles.attractionContent}>
                                    <View style={styles.attractionHeader}>
                                        <Text style={styles.attractionName} numberOfLines={1}>
                                            {attraction.name}
                                        </Text>
                                        <View style={styles.scoreContainer}>
                                            <Ionicons name="star" size={14} color={Colors.warning} />
                                            <Text style={styles.scoreText}>
                                                {(attraction.score * 100).toFixed(0)}%
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryText}>{attraction.category}</Text>
                                    </View>

                                    <View style={styles.attractionDetails}>
                                        <View style={styles.detailItem}>
                                            <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                                            <Text style={styles.detailText}>
                                                LKR {parseFloat(attraction.avg_cost || 0).toFixed(0)}
                                            </Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                                            <Text style={styles.detailText}>
                                                {parseFloat(attraction.avg_duration_hours || 2).toFixed(1)}h
                                            </Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Ionicons
                                                name="speedometer-outline"
                                                size={16}
                                                color={Colors.textSecondary}
                                            />
                                            <Text style={styles.detailText}>
                                                {(parseFloat(attraction.popularity_score || 0) * 10).toFixed(1)}/10
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.attractionFooter}>
                                        <View style={styles.safetyContainer}>
                                            <Ionicons
                                                name="shield-checkmark"
                                                size={14}
                                                color={Colors.success}
                                            />
                                            <Text style={styles.safetyText}>
                                                Safety: {parseFloat(attraction.safety_rating || 0.8).toFixed(1)}/1.0
                                            </Text>
                                        </View>
                                        <TouchableOpacity>
                                            <Ionicons name="heart-outline" size={20} color={Colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {selectedHotels.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="bed-outline" size={24} color={Colors.primary} />
                                <Text style={styles.sectionTitle}>
                                    Recommended Hotels ({selectedHotels.length} nights)
                                </Text>
                            </View>

                            {selectedHotels.map((hotel, index) => (
                                <View key={hotel.id} style={styles.hotelCard}>
                                    <Image
                                        source={{ uri: hotel.image }}
                                        style={styles.hotelImage}
                                    />
                                    <View style={styles.hotelInfo}>
                                        <View style={styles.hotelHeader}>
                                            <Text style={styles.hotelName}>{hotel.name}</Text>
                                            <View style={styles.hotelRating}>
                                                <Ionicons name="star" size={14} color={Colors.secondary} />
                                                <Text style={styles.ratingText}>{hotel.rating}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.hotelDetails}>
                                            <View style={styles.hotelDetail}>
                                                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                                                <Text style={styles.hotelDetailText}>{hotel.city}</Text>
                                            </View>
                                            <View style={styles.hotelDetail}>
                                                <Ionicons name="navigate-outline" size={14} color={Colors.textSecondary} />
                                                <Text style={styles.hotelDetailText}>
                                                    {hotel.distanceToAttractions}km to attractions
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.hotelAmenities}>
                                            {hotel.amenities.slice(0, 3).map((amenity, i) => (
                                                <View key={i} style={styles.amenityBadge}>
                                                    <Text style={styles.amenityText}>{amenity}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={styles.hotelPricing}>
                                            <Text style={styles.nightLabel}>Night {index + 1}</Text>
                                            <Text style={styles.priceText}>
                                                LKR {hotel.pricePerNight.toLocaleString()}/night
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}

                            <View style={styles.totalAccommodation}>
                                <Text style={styles.totalLabel}>Total Accommodation</Text>
                                <Text style={styles.totalValue}>
                                    LKR {selectedHotels.reduce((sum, h) => sum + h.pricePerNight, 0).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.checkSafetyButton]}
                    onPress={checkSafety}
                >
                    <Ionicons name="shield-checkmark" size={20} color={Colors.surface} />
                    <Text style={styles.actionButtonText}>Check Safety</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={saveItinerary}
                >
                    <Ionicons name="bookmark" size={20} color={Colors.surface} />
                    <Text style={styles.actionButtonText}>Save Trip</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: 16,
        color: Colors.textSecondary,
    },
    header: {
        paddingTop: 60,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.surface,
    },
    summaryContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: Spacing.xs,
    },
    summaryLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        alignItems: 'center',
    },
    marker: {
        backgroundColor: Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    markerText: {
        color: Colors.surface,
        fontSize: 14,
        fontWeight: 'bold',
    },
    mapInfoCard: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    closeMapInfo: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapInfoName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    mapInfoCategory: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
        marginBottom: Spacing.md,
    },
    mapInfoDetails: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    mapInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    mapInfoText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    attractionCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    attractionNumber: {
        position: 'absolute',
        top: Spacing.sm,
        left: Spacing.sm,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    attractionNumberText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    attractionImage: {
        width: '100%',
        height: 180,
        backgroundColor: Colors.border,
    },
    attractionContent: {
        padding: Spacing.md,
    },
    attractionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    attractionName: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warning + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4,
        marginLeft: Spacing.sm,
    },
    scoreText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.warning,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.primary + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.sm,
    },
    categoryText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
    },
    attractionDetails: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    attractionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    safetyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    safetyText: {
        fontSize: 12,
        color: Colors.success,
        fontWeight: '600',
    },
    actionButtonsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: Spacing.sm,
        padding: Spacing.md,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.xs,
    },
    checkSafetyButton: {
        backgroundColor: Colors.danger,
    },
    saveButton: {
        backgroundColor: Colors.success,
    },
    actionButtonText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    hotelCard: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    hotelImage: {
        width: 120,
        height: 160,
    },
    hotelInfo: {
        flex: 1,
        padding: Spacing.sm,
    },
    hotelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.xs,
    },
    hotelName: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    hotelRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    hotelDetails: {
        gap: 4,
        marginBottom: Spacing.xs,
    },
    hotelDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    hotelDetailText: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    hotelAmenities: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: Spacing.xs,
    },
    amenityBadge: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    amenityText: {
        fontSize: 9,
        color: Colors.primary,
        fontWeight: '600',
    },
    hotelPricing: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    nightLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    priceText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    totalAccommodation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.primary + '15',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
    },
});