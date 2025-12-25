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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

const MOCK_ALTERNATIVES = [
    {
        attraction_id: 'alt_1',
        name: 'Royal Botanical Gardens',
        category: 'Nature',
        riskScore: 0.15,
        weatherRisk: 0.1,
        image_url: 'https://images.unsplash.com/photo-1596627689623-2868da38891f?w=400',
        safety_rating: 0.95,
        avg_cost: 2500,
        reason: 'Better weather conditions and lower crowd density today.'
    },
    {
        attraction_id: 'alt_2',
        name: 'Bahirawakanda Temple',
        category: 'Cultural',
        riskScore: 0.2,
        weatherRisk: 0.1,
        image_url: 'https://images.unsplash.com/photo-1588595280408-d42f76953032?w=400',
        safety_rating: 0.9,
        avg_cost: 1000,
        reason: 'Located away from the current traffic congestion zone.'
    },
    {
        attraction_id: 'alt_3',
        name: 'Udawatta Kele Sanctuary',
        category: 'Nature',
        riskScore: 0.25,
        weatherRisk: 0.2,
        image_url: 'https://images.unsplash.com/photo-1544641957-69c24090b8f9?w=400',
        safety_rating: 0.85,
        avg_cost: 1500,
        reason: 'Moderate weather but safe from reported incidents.'
    }
];

export default function RiskAlternativesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    const [loading, setLoading] = useState(true);
    const [originalLocation, setOriginalLocation] = useState(null);
    const [alternatives, setAlternatives] = useState([]);
    const [selectedAlt, setSelectedAlt] = useState(null);

    useEffect(() => {
        if (params.locationData) {
            try {
                const location = JSON.parse(params.locationData);
                setOriginalLocation(location);
                // Simulate loading alternatives
                setTimeout(() => {
                    setAlternatives(MOCK_ALTERNATIVES);
                    setLoading(false);
                }, 1500);
            } catch (error) {
                console.error("Error parsing location data", error);
                setLoading(false);
            }
        }
    }, [params.locationData]); // <--- FIXED: Dependency changed from [params] to [params.locationData]

    const handleReplace = () => {
        Alert.alert(
            "Itinerary Updated",
            `Successfully replaced ${originalLocation.name} with ${selectedAlt.name}.`,
            [
                { 
                    text: "View Itinerary", 
                    onPress: () => router.dismissTo('/(tourist)/itinerary') 
                }
            ]
        );
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

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                
                {/* Current Risky Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Selection (High Risk)</Text>
                    <View style={[styles.card, styles.riskyCard]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{originalLocation?.name}</Text>
                            <View style={[styles.badge, { backgroundColor: Colors.danger }]}>
                                <Text style={styles.badgeText}>
                                    Risk: {(originalLocation?.riskScore * 100).toFixed(0)}%
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.reasonText}>
                            High risk due to {originalLocation?.riskFactors?.[0] || "adverse conditions"}.
                        </Text>
                    </View>
                </View>

                {/* Alternatives List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recommended Alternatives</Text>
                    {alternatives.map((item) => (
                        <TouchableOpacity 
                            key={item.attraction_id} 
                            style={[
                                styles.card, 
                                selectedAlt?.attraction_id === item.attraction_id && styles.selectedCard
                            ]}
                            onPress={() => setSelectedAlt(item)}
                        >
                            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
                            
                            <View style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>{item.name}</Text>
                                    <View style={[styles.badge, { backgroundColor: Colors.success }]}>
                                        <Text style={styles.badgeText}>
                                            Risk: {(item.riskScore * 100).toFixed(0)}%
                                        </Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.categoryText}>{item.category}</Text>
                                <Text style={styles.reasonText}>Why: {item.reason}</Text>

                                <View style={styles.metaRow}>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                                        <Text style={styles.metaText}>LKR {item.avg_cost}</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                                        <Text style={[styles.metaText, { color: Colors.success }]}>
                                            Safety: {(item.safety_rating * 10).toFixed(1)}/10
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Radio Button UI */}
                            <View style={styles.radioButton}>
                                {selectedAlt?.attraction_id === item.attraction_id && (
                                    <View style={styles.radioButtonSelected} />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>

            {/* Bottom Action Button */}
            {selectedAlt && (
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.replaceButton} onPress={handleReplace}>
                        <LinearGradient
                            colors={[Colors.success, '#2ecc71']}
                            style={styles.buttonGradient}
                        >
                            <Ionicons name="swap-horizontal" size={24} color={Colors.surface} />
                            <Text style={styles.buttonText}>Replace with Selected</Text>
                        </LinearGradient>
                    </TouchableOpacity>
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
        paddingBottom: 100,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        ...Typography.h3,
        marginBottom: Spacing.md,
        color: Colors.text,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    riskyCard: {
        borderColor: Colors.danger,
        backgroundColor: Colors.danger + '10',
        padding: Spacing.md,
    },
    selectedCard: {
        borderColor: Colors.success,
        backgroundColor: Colors.success + '10',
    },
    cardImage: {
        width: '100%',
        height: 120,
    },
    cardContent: {
        padding: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        flex: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    categoryText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    reasonText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
        fontStyle: 'italic',
    },
    metaRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    radioButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.success,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    replaceButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    buttonText: {
        color: Colors.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
});