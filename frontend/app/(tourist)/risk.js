import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { simulateRiskData } from '../../services/riskSimulator';
import {ConditionalMapView, ConditionalMarker} from "../../components/MapWrapper";
import { loadAttractions } from "../../services/csvDataLoader";

const { width, height } = Dimensions.get('window');

export default function RiskCheckerScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [savedItineraries, setSavedItineraries] = useState([]);
    const [selectedItinerary, setSelectedItinerary] = useState(null);
    const [riskData, setRiskData] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showAlternatives, setShowAlternatives] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadSavedItineraries();
        }, [user])
    );

    useEffect(() => {
        // If coming from itinerary results with data
        if (params.itineraryData) {
            try {
                const data = JSON.parse(params.itineraryData);
                setSelectedItinerary(data);
            } catch (error) {
                console.error('Error parsing itinerary data:', error);
            }
        }
    }, [params.itineraryData]);


    const loadSavedItineraries = async () => {
        try {
            const itinerariesQuery = query(
                collection(db, 'itineraries'),
                where('userId', '==', user?.uid || 'temp')
            );
            const snapshot = await getDocs(itinerariesQuery);
            const itineraries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setSavedItineraries(itineraries);

            // Auto-select the most recent itinerary if none selected
            if (itineraries.length > 0 && !selectedItinerary) {
                setSelectedItinerary(itineraries[0]);
            }
        } catch (error) {
            console.error('Error loading itineraries:', error);
        }
    };


    const handleSimulateRisk = async () => {
        if (!selectedItinerary) {
            Alert.alert('No Itinerary', 'Please select an itinerary first.');
            return;
        }

        setLoading(true);

        try {
            const allAttractions = await loadAttractions();

            const selectedIds =
                selectedItinerary.selectedAttractions ||
                selectedItinerary.attractions ||
                [];

// Convert ID → actual attraction object
// Some itineraries may store numbers, some strings → normalize everything
            const normalizedIds = selectedIds.map(id => String(id).trim());

//  Match using CSV field = attraction_id
            const attractions = normalizedIds
                .map(id =>
                    allAttractions.find(
                        item => String(item.attraction_id).trim() === id
                    )
                )
                .filter(a => a && a.latitude && a.longitude);

            console.log("Final attraction objects:", attractions);

            console.log("Mapped attractions:", attractions);

            console.log("Selected itinerary:", selectedItinerary);
            console.log("Attractions field:", selectedItinerary.attractions);
            console.log("First attraction:", selectedItinerary.attractions?.[0]);

            if (!attractions.length) {
                Alert.alert(
                    'No locations',
                    'This itinerary does not contain any attractions/locations to analyze.'
                );
                setLoading(false);
                return;
            }

            const simulatedData = simulateRiskData(attractions);
            console.log('Simulated risk data:', simulatedData);

            setRiskData(simulatedData);
            if (simulatedData.locations && simulatedData.locations.length > 0) {
                setSelectedLocation(simulatedData.locations[0]);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error simulating risk:', error);
            Alert.alert('Error', 'Failed to simulate risk data.');
            setLoading(false);
        }
    };



    const getRiskColor = (riskScore) => {
        if (riskScore < 0.3) return Colors.success;
        if (riskScore < 0.6) return Colors.warning;
        return Colors.danger;
    };

    const getRiskCategory = (riskScore) => {
        if (riskScore < 0.3) return 'LOW';
        if (riskScore < 0.6) return 'MEDIUM';
        return 'HIGH';
    };

    if (!riskData) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[Colors.danger, Colors.warning]}
                    style={styles.header}
                >
                    <Text style={styles.headerTitle}>Risk Zone Checker</Text>
                    <Text style={styles.headerSubtitle}>
                        Check safety conditions for your trip
                    </Text>
                </LinearGradient>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Select Itinerary */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Your Trip</Text>

                        {savedItineraries.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="map-outline" size={64} color={Colors.textSecondary} />
                                <Text style={styles.emptyStateText}>No saved itineraries</Text>
                                <Text style={styles.emptyStateSubtext}>
                                    Create an itinerary first to check safety
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyStateButton}
                                    onPress={() => router.push('/(tourist)/itinerary')}
                                >
                                    <Text style={styles.emptyStateButtonText}>Plan Trip</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                {savedItineraries.map((itinerary) => (
                                    <TouchableOpacity
                                        key={itinerary.id}
                                        style={[
                                            styles.itineraryCard,
                                            selectedItinerary?.id === itinerary.id && styles.itineraryCardSelected,
                                        ]}
                                        onPress={() => setSelectedItinerary(itinerary)}
                                    >
                                        <View style={styles.itineraryHeader}>
                                            <Text style={styles.itineraryTitle}>
                                                {itinerary.activityType?.toUpperCase()} Trip
                                            </Text>
                                            {selectedItinerary?.id === itinerary.id && (
                                                <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                                            )}
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

                    {/* Simulate Button */}
                    {selectedItinerary && (
                        <TouchableOpacity
                            style={styles.simulateButton}
                            onPress={handleSimulateRisk}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[Colors.danger, Colors.warning]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.simulateButtonGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color={Colors.surface} />
                                ) : (
                                    <>
                                        <Ionicons name="analytics" size={24} color={Colors.surface} />
                                        <Text style={styles.simulateButtonText}>Simulate Risk Analysis</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={24} color={Colors.accent} />
                        <View style={styles.infoBoxContent}>
                            <Text style={styles.infoBoxTitle}>How it works</Text>
                            <Text style={styles.infoBoxText}>
                                We analyze real-time weather, traffic, and incident data to assess risk levels for each destination in your itinerary.
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // Risk Results View
    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[Colors.danger, Colors.warning]}
                style={styles.headerSmall}
            >
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setRiskData(null)}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.surface} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleSmall}>Risk Analysis</Text>
                    <TouchableOpacity onPress={handleSimulateRisk}>
                        <Ionicons name="refresh" size={24} color={Colors.surface} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Map View */}
            <ConditionalMapView
                style={styles.map}
                initialRegion={{
                    latitude: parseFloat(riskData.locations[0]?.latitude || 7.8731),
                    longitude: parseFloat(riskData.locations[0]?.longitude || 80.7718),
                    latitudeDelta: 2,
                    longitudeDelta: 2,
                }}
            >
                {riskData.locations.map((location, index) => (
                    <React.Fragment key={index}>
                        {/* Risk Zone Circle */}
                        <Circle
                            center={{
                                latitude: parseFloat(location.latitude),
                                longitude: parseFloat(location.longitude),
                            }}
                            radius={location.riskScore * 10000}
                            fillColor={getRiskColor(location.riskScore) + '40'}
                            strokeColor={getRiskColor(location.riskScore)}
                            strokeWidth={2}
                        />

                        {/* Marker */}
                        <ConditionalMarker
                            coordinate={{
                                latitude: parseFloat(location.latitude),
                                longitude: parseFloat(location.longitude),
                            }}
                            onPress={() => setSelectedLocation(location)}
                        >
                            <View
                                style={[
                                    styles.mapMarker,
                                    { backgroundColor: getRiskColor(location.riskScore) },
                                ]}
                            >
                                <Text style={styles.mapMarkerText}>{index + 1}</Text>
                            </View>
                        </ConditionalMarker>
                    </React.Fragment>
                ))}
            </ConditionalMapView>

            {/* Location Details Panel */}
            {selectedLocation && (
                <View style={styles.detailsPanel}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.detailsPanelContent}
                    >
                        <TouchableOpacity
                            style={styles.closeDetailsButton}
                            onPress={() => setSelectedLocation(null)}
                        >
                            <Ionicons name="close" size={20} color={Colors.text} />
                        </TouchableOpacity>

                        <Text style={styles.detailsLocationName}>{selectedLocation.name}</Text>

                        {/* Risk Gauge */}
                        <View style={styles.riskGaugeContainer}>
                            <View style={styles.riskGauge}>
                                <View
                                    style={[
                                        styles.riskGaugeFill,
                                        {
                                            width: `${selectedLocation.riskScore * 100}%`,
                                            backgroundColor: getRiskColor(selectedLocation.riskScore),
                                        },
                                    ]}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.riskCategoryText,
                                    { color: getRiskColor(selectedLocation.riskScore) },
                                ]}
                            >
                                {getRiskCategory(selectedLocation.riskScore)} RISK
                            </Text>
                        </View>

                        {/* Risk Score */}
                        <View style={styles.riskScoreCard}>
                            <Text style={styles.riskScoreLabel}>Overall Risk Score</Text>
                            <Text
                                style={[
                                    styles.riskScoreValue,
                                    { color: getRiskColor(selectedLocation.riskScore) },
                                ]}
                            >
                                {(selectedLocation.riskScore * 100).toFixed(0)}%
                            </Text>
                        </View>

                        {/* Risk Breakdown */}
                        <View style={styles.breakdownSection}>
                            <Text style={styles.breakdownTitle}>Risk Breakdown</Text>

                            <View style={styles.breakdownCard}>
                                <View style={styles.breakdownItem}>
                                    <View style={styles.breakdownHeader}>
                                        <Ionicons name="rainy" size={20} color={Colors.accent} />
                                        <Text style={styles.breakdownLabel}>Weather Risk</Text>
                                    </View>
                                    <Text style={styles.breakdownValue}>
                                        {(selectedLocation.weatherRisk * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <View style={styles.breakdownDetails}>
                                    <Text style={styles.breakdownDetailText}>
                                        Temperature: {selectedLocation.simulatedData.temperature}°C
                                    </Text>
                                    <Text style={styles.breakdownDetailText}>
                                        Rainfall: {selectedLocation.simulatedData.rainfall}mm
                                    </Text>
                                    <Text style={styles.breakdownDetailText}>
                                        Wind: {selectedLocation.simulatedData.windSpeed}km/h
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.breakdownCard}>
                                <View style={styles.breakdownItem}>
                                    <View style={styles.breakdownHeader}>
                                        <Ionicons name="car" size={20} color={Colors.warning} />
                                        <Text style={styles.breakdownLabel}>Traffic Risk</Text>
                                    </View>
                                    <Text style={styles.breakdownValue}>
                                        {(selectedLocation.trafficRisk * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <View style={styles.breakdownDetails}>
                                    <Text style={styles.breakdownDetailText}>
                                        Congestion Level: {selectedLocation.simulatedData.congestionLevel}/10
                                    </Text>
                                    <Text style={styles.breakdownDetailText}>
                                        Avg Speed: {selectedLocation.simulatedData.avgSpeed}km/h
                                    </Text>
                                    <Text style={styles.breakdownDetailText}>
                                        Traffic Volume: {selectedLocation.simulatedData.trafficVolume}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.breakdownCard}>
                                <View style={styles.breakdownItem}>
                                    <View style={styles.breakdownHeader}>
                                        <Ionicons name="warning" size={20} color={Colors.danger} />
                                        <Text style={styles.breakdownLabel}>Incident Risk</Text>
                                    </View>
                                    <Text style={styles.breakdownValue}>
                                        {(selectedLocation.incidentRisk * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <View style={styles.breakdownDetails}>
                                    <Text style={styles.breakdownDetailText}>
                                        Recent Accidents: {selectedLocation.simulatedData.recentAccidents}
                                    </Text>
                                    <Text style={styles.breakdownDetailText}>
                                        Recent Incidents: {selectedLocation.simulatedData.recentIncidents}
                                    </Text>
                                    <Text style={styles.breakdownDetailText}>
                                        Severity Level: {selectedLocation.simulatedData.severityLevel}/5
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Risk Factors */}
                        {selectedLocation.riskFactors.length > 0 && (
                            <View style={styles.factorsSection}>
                                <Text style={styles.factorsTitle}>⚠️ Risk Factors</Text>
                                {selectedLocation.riskFactors.map((factor, index) => (
                                    <View key={index} style={styles.factorItem}>
                                        <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                                        <Text style={styles.factorText}>{factor}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Recommendations */}
                        <View style={styles.recommendationsSection}>
                            <Text style={styles.recommendationsTitle}>💡 Recommendations</Text>
                            {selectedLocation.recommendations.map((rec, index) => (
                                <View key={index} style={styles.recommendationItem}>
                                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                                    <Text style={styles.recommendationText}>{rec}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Find Alternative Button */}
                        <TouchableOpacity
                            style={styles.alternativeButton}
                            onPress={() => {
                                router.push({
                                    pathname: '/(tourist)/risk-alternatives',
                                    params: {
                                        locationData: JSON.stringify(selectedLocation),
                                        itineraryData: JSON.stringify(selectedItinerary),
                                    },
                                });
                            }}
                        >
                            <Ionicons name="swap-horizontal" size={20} color={Colors.surface} />
                            <Text style={styles.alternativeButtonText}>Find Safer Alternative</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            {/* Summary Footer (when no location selected) */}
            {!selectedLocation && (
                <View style={styles.summaryFooter}>
                    <View style={styles.summaryStats}>
                        <View style={styles.summaryStatItem}>
                            <Text style={styles.summaryStatValue}>
                                {riskData.locations.filter(l => l.riskScore < 0.3).length}
                            </Text>
                            <Text style={styles.summaryStatLabel}>Low Risk</Text>
                        </View>
                        <View style={styles.summaryStatItem}>
                            <Text style={[styles.summaryStatValue, { color: Colors.warning }]}>
                                {riskData.locations.filter(l => l.riskScore >= 0.3 && l.riskScore < 0.6).length}
                            </Text>
                            <Text style={styles.summaryStatLabel}>Medium Risk</Text>
                        </View>
                        <View style={styles.summaryStatItem}>
                            <Text style={[styles.summaryStatValue, { color: Colors.danger }]}>
                                {riskData.locations.filter(l => l.riskScore >= 0.6).length}
                            </Text>
                            <Text style={styles.summaryStatLabel}>High Risk</Text>
                        </View>
                    </View>
                    <Text style={styles.summaryHint}>Tap on a location to see details</Text>
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
        paddingTop: 60,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: Spacing.xs,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.surface,
        opacity: 0.9,
    },
    headerSmall: {
        paddingTop: 60,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleSmall: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.surface,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
        marginBottom: Spacing.md,
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
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
    },
    emptyStateButtonText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: '600',
    },
    itineraryCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.border,
    },
    itineraryCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    itineraryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    itineraryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    itineraryDetails: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    itineraryDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    itineraryDetailText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    simulateButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
    },
    simulateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    simulateButtonText: {
        color: Colors.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: Colors.accent + '20',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.md,
    },
    infoBoxContent: {
        flex: 1,
    },
    infoBoxTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    infoBoxText: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    map: {
        flex: 1,
    },
    mapMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    mapMarkerText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    detailsPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: height * 0.7,
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl * 2,
        borderTopRightRadius: BorderRadius.xl * 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    detailsPanelContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },
    closeDetailsButton: {
        alignSelf: 'flex-end',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    detailsLocationName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    riskGaugeContainer: {
        marginBottom: Spacing.lg,
    },
    riskGauge: {
        height: 12,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    riskGaugeFill: {
        height: '100%',
        borderRadius: BorderRadius.sm,
    },
    riskCategoryText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    riskScoreCard: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    riskScoreLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    riskScoreValue: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    breakdownSection: {
        marginBottom: Spacing.lg,
    },
    breakdownTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    breakdownCard: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    breakdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    breakdownLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    breakdownValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    breakdownDetails: {
        gap: 4,
    },
    breakdownDetailText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    factorsSection: {
        marginBottom: Spacing.lg,
    },
    factorsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    factorItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        backgroundColor: Colors.danger + '10',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xs,
    },
    factorText: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    recommendationsSection: {
        marginBottom: Spacing.lg,
    },
    recommendationsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    recommendationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        backgroundColor: Colors.success + '10',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xs,
    },
    recommendationText: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    alternativeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    alternativeButtonText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryFooter: {
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        padding: Spacing.lg,
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.sm,
    },
    summaryStatItem: {
        alignItems: 'center',
    },
    summaryStatValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.success,
    },
    summaryStatLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    summaryHint: {
        textAlign: 'center',
        fontSize: 14,
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
});