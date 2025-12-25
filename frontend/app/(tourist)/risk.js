import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Circle } from 'react-native-maps';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
// Make sure this path points to where you saved the logic file
import { simulateRiskData } from '../../services/riskSimulator'; 
import { ConditionalMapView, ConditionalMarker } from "../../components/MapWrapper";
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

    useEffect(() => {
        loadSavedItineraries();

        if (params.itineraryData) {
            try {
                const data = JSON.parse(params.itineraryData);
                setSelectedItinerary(data);
            } catch (error) {
                console.error('Error parsing itinerary data:', error);
            }
        }
    }, []);

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
            const selectedIds = selectedItinerary.selectedAttractions || selectedItinerary.attractions || [];
            const normalizedIds = selectedIds.map(id => String(id).trim());

            const attractions = normalizedIds
                .map(id => allAttractions.find(item => String(item.attraction_id).trim() === id))
                .filter(a => a && a.latitude && a.longitude);

            if (!attractions.length) {
                Alert.alert('No locations', 'This itinerary does not contain any valid attractions.');
                setLoading(false);
                return;
            }

            const simulatedData = simulateRiskData(attractions);
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

    // --- VIEW 1: SELECTION SCREEN ---
    if (!riskData) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[Colors.danger, Colors.warning]}
                    style={styles.header}
                >
                    <Text style={styles.headerTitle}>Risk Zone Checker</Text>
                    <Text style={styles.headerSubtitle}>Check safety conditions for your trip</Text>
                </LinearGradient>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Your Trip</Text>
                        {savedItineraries.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="map-outline" size={64} color={Colors.textSecondary} />
                                <Text style={styles.emptyStateText}>No saved itineraries</Text>
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
                                        <Text style={styles.itineraryDetailText}>
                                            {(itinerary.selectedAttractions || []).length} places • {itinerary.availableDays} days
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {selectedItinerary && (
                        <TouchableOpacity
                            style={styles.simulateButton}
                            onPress={handleSimulateRisk}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[Colors.danger, Colors.warning]}
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
                </ScrollView>
            </View>
        );
    }

    // --- VIEW 2: MAP & DETAILS SCREEN ---
    return (
        <View style={styles.container}>
            <LinearGradient colors={[Colors.danger, Colors.warning]} style={styles.headerSmall}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => setRiskData(null)}>
                        <Ionicons name="arrow-back" size={24} color={Colors.surface} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleSmall}>Risk Analysis</Text>
                    <TouchableOpacity onPress={handleSimulateRisk}>
                        <Ionicons name="refresh" size={24} color={Colors.surface} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

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
                        <ConditionalMarker
                            coordinate={{
                                latitude: parseFloat(location.latitude),
                                longitude: parseFloat(location.longitude),
                            }}
                            onPress={() => setSelectedLocation(location)}
                        >
                            <View style={[styles.mapMarker, { backgroundColor: getRiskColor(location.riskScore) }]}>
                                <Text style={styles.mapMarkerText}>{index + 1}</Text>
                            </View>
                        </ConditionalMarker>
                    </React.Fragment>
                ))}
            </ConditionalMapView>

            {selectedLocation && (
                <View style={styles.detailsPanel}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsPanelContent}>
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
                            <Text style={[styles.riskCategoryText, { color: getRiskColor(selectedLocation.riskScore) }]}>
                                {getRiskCategory(selectedLocation.riskScore)} RISK ({(selectedLocation.riskScore * 100).toFixed(0)}%)
                            </Text>
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

                        {/* --- THIS IS THE FIXED BUTTON --- */}
                        <TouchableOpacity
                            style={styles.alternativeButton}
                            onPress={() => {
                                router.push({
                                    pathname: '/risk-alternatives', // <--- FIXED PATH
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingTop: 60, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: Colors.surface, marginBottom: Spacing.xs },
    headerSubtitle: { fontSize: 16, color: Colors.surface, opacity: 0.9 },
    headerSmall: { paddingTop: 60, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitleSmall: { fontSize: 20, fontWeight: 'bold', color: Colors.surface },
    content: { flex: 1 },
    scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
    section: { marginBottom: Spacing.lg },
    sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },
    emptyState: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center' },
    emptyStateText: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: Spacing.md },
    emptyStateButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.md },
    emptyStateButtonText: { color: Colors.surface, fontSize: 16, fontWeight: '600' },
    itineraryCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 2, borderColor: Colors.border },
    itineraryCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
    itineraryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    itineraryTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    itineraryDetailText: { fontSize: 13, color: Colors.textSecondary },
    simulateButton: { borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.lg },
    simulateButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
    simulateButtonText: { color: Colors.surface, fontSize: 18, fontWeight: 'bold' },
    map: { flex: 1 },
    mapMarker: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
    mapMarkerText: { color: Colors.surface, fontSize: 16, fontWeight: 'bold' },
    detailsPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: height * 0.7, backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl * 2, borderTopRightRadius: BorderRadius.xl * 2, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
    detailsPanelContent: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
    closeDetailsButton: { alignSelf: 'flex-end', width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
    detailsLocationName: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
    riskGaugeContainer: { marginBottom: Spacing.lg },
    riskGauge: { height: 12, backgroundColor: Colors.border, borderRadius: BorderRadius.sm, overflow: 'hidden', marginBottom: Spacing.sm },
    riskGaugeFill: { height: '100%', borderRadius: BorderRadius.sm },
    riskCategoryText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    factorsSection: { marginBottom: Spacing.lg },
    factorsTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
    factorItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.danger + '10', padding: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.xs },
    factorText: { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 20 },
    alternativeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, gap: Spacing.sm },
    alternativeButtonText: { color: Colors.surface, fontSize: 16, fontWeight: 'bold' },
});