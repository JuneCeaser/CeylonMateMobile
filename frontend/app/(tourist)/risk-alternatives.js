import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { generateAlternatives, simulateRiskData } from '../../services/riskSimulator';
import { loadAttractions } from '../../services/csvDataLoader';

const { width } = Dimensions.get('window');

export default function RiskAlternativesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [loading, setLoading] = useState(true);
    const [originalLocation, setOriginalLocation] = useState(null);
    const [alternatives, setAlternatives] = useState([]);

    useEffect(() => {
        loadAlternatives();
    }, []);

    const loadAlternatives = async () => {
        try {
            setLoading(true);

            // Parse the location data
            const location = JSON.parse(params.locationData);
            setOriginalLocation(location);

            // Load all attractions
            const allAttractions = await loadAttractions();

            // Generate alternatives
            const alternativeLocations = await generateAlternatives(
                location,
                allAttractions,
                {}
            );

            setAlternatives(alternativeLocations);
            setLoading(false);
        } catch (error) {
            console.error('Error loading alternatives:', error);
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Finding safer alternatives...</Text>
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
                    <Text style={styles.headerTitle}>Safer Alternatives</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Original Location */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Original Location</Text>
                    <View style={[styles.locationCard, styles.originalCard]}>
                        <View style={styles.locationHeader}>
                            <View style={styles.locationIcon}>
                                <Ionicons name="location" size={24} color={Colors.danger} />
                            </View>
                            <View style={styles.locationInfo}>
                                <Text style={styles.locationName}>
                                    {originalLocation?.name || 'Unknown Location'}
                                </Text>
                                <Text style={styles.locationCategory}>
                                    {originalLocation?.category}
                                </Text>
                            </View>
                        </View>

                        {/* Risk Score */}
                        <View style={styles.riskBadge}>
                            <View
                                style={[
                                    styles.riskDot,
                                    { backgroundColor: getRiskColor(originalLocation?.riskScore || 0) },
                                ]}
                            />
                            <Text style={styles.riskText}>
                                {getRiskCategory(originalLocation?.riskScore || 0)} RISK
                            </Text>
                            <Text style={styles.riskScore}>
                                {((originalLocation?.riskScore || 0) * 100).toFixed(0)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Alternative Locations */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Recommended Alternatives ({alternatives.length})
                    </Text>

                    {alternatives.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="search-outline" size={64} color={Colors.textSecondary} />
                            <Text style={styles.emptyStateText}>No alternatives found</Text>
                            <Text style={styles.emptyStateSubtext}>
                                Try selecting a different location
                            </Text>
                        </View>
                    ) : (
                        alternatives.map((alternative, index) => (
                            <View key={alternative.attraction_id} style={styles.locationCard}>
                                {/* Rank Badge */}
                                <View style={styles.rankBadge}>
                                    <Text style={styles.rankText}>#{index + 1}</Text>
                                </View>

                                <View style={styles.locationHeader}>
                                    <View style={styles.locationIcon}>
                                        <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                                    </View>
                                    <View style={styles.locationInfo}>
                                        <Text style={styles.locationName}>{alternative.name}</Text>
                                        <Text style={styles.locationCategory}>{alternative.category}</Text>
                                    </View>
                                </View>

                                {/* Risk Comparison */}
                                <View style={styles.comparisonContainer}>
                                    <View style={styles.comparisonItem}>
                                        <Text style={styles.comparisonLabel}>Risk Level</Text>
                                        <View
                                            style={[
                                                styles.comparisonBadge,
                                                { backgroundColor: getRiskColor(alternative.riskScore) + '20' },
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.riskDot,
                                                    { backgroundColor: getRiskColor(alternative.riskScore) },
                                                ]}
                                            />
                                            <Text
                                                style={[
                                                    styles.comparisonValue,
                                                    { color: getRiskColor(alternative.riskScore) },
                                                ]}
                                            >
                                                {getRiskCategory(alternative.riskScore)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.comparisonItem}>
                                        <Text style={styles.comparisonLabel}>Score</Text>
                                        <Text
                                            style={[
                                                styles.scoreValue,
                                                { color: getRiskColor(alternative.riskScore) },
                                            ]}
                                        >
                                            {(alternative.riskScore * 100).toFixed(0)}%
                                        </Text>
                                    </View>

                                    <View style={styles.comparisonItem}>
                                        <Text style={styles.comparisonLabel}>Safety</Text>
                                        <View style={styles.safetyStars}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Ionicons
                                                    key={star}
                                                    name="star"
                                                    size={14}
                                                    color={
                                                        star <= parseFloat(alternative.safety_rating || 0) * 5
                                                            ? Colors.secondary
                                                            : Colors.border
                                                    }
                                                />
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                {/* Details */}
                                <View style={styles.detailsGrid}>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                                        <Text style={styles.detailText}>
                                            {alternative.avg_duration_hours || 'N/A'} hrs
                                        </Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                                        <Text style={styles.detailText}>
                                            LKR {parseFloat(alternative.avg_cost || 0).toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                                        <Text style={styles.detailText}>{alternative.district || 'N/A'}</Text>
                                    </View>
                                </View>

                                {/* Select Button */}
                                <TouchableOpacity
                                    style={styles.selectButton}
                                    onPress={() => {
                                        // Navigate back with the selected alternative
                                        router.back();
                                    }}
                                >
                                    <Text style={styles.selectButtonText}>Select This Location</Text>
                                    <Ionicons name="arrow-forward" size={16} color={Colors.surface} />
                                </TouchableOpacity>
                            </View>
                        ))
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
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
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
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    locationCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    originalCard: {
        borderWidth: 2,
        borderColor: Colors.danger + '40',
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    locationIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    locationInfo: {
        flex: 1,
    },
    locationName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 2,
    },
    locationCategory: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    rankBadge: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.round,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: {
        color: Colors.surface,
        fontSize: 12,
        fontWeight: 'bold',
    },
    riskBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        gap: Spacing.xs,
    },
    riskDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    riskText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text,
        flex: 1,
    },
    riskScore: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    comparisonContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    comparisonItem: {
        flex: 1,
    },
    comparisonLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    comparisonBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.xs,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    comparisonValue: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    safetyStars: {
        flexDirection: 'row',
        gap: 2,
    },
    detailsGrid: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.xs,
    },
    selectButtonText: {
        color: Colors.surface,
        fontSize: 14,
        fontWeight: 'bold',
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
});