import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function ItineraryGeneratorScreen() {
    const router = useRouter();

    // Form state
    const [budget, setBudget] = useState(150000);
    const [days, setDays] = useState(3);
    const [travelers, setTravelers] = useState(2);
    const [distance, setDistance] = useState(100);
    const [activityType, setActivityType] = useState('cultural');
    const [season, setSeason] = useState(1);
    const [startLocation, setStartLocation] = useState('Colombo');

    const activityTypes = [
        { value: 'cultural', label: 'Cultural', icon: 'temple' },
        { value: 'beach', label: 'Beach', icon: 'water' },
        { value: 'wildlife', label: 'Wildlife', icon: 'paw' },
        { value: 'adventure', label: 'Adventure', icon: 'bicycle' },
        { value: 'nature', label: 'Nature', icon: 'leaf' },
        { value: 'historical', label: 'Historical', icon: 'library' },
    ];

    const seasons = [
        { value: 1, label: 'Dry Season (Dec-Mar)' },
        { value: 2, label: 'Inter-monsoon (Apr-May)' },
        { value: 3, label: 'Southwest Monsoon (Jun-Sep)' },
        { value: 4, label: 'Northeast Monsoon (Oct-Nov)' },
    ];

    const handleGenerate = () => {
        const itineraryData = {
            budget,
            availableDays: days,
            numTravelers: travelers,
            distancePreference: distance,
            activityType,
            season,
            startLocation,
        };

        // Navigate to results screen with data
        router.push({
            pathname: '/(tourist)/itinerary-results',
            params: itineraryData,
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[Colors.primary, Colors.accent]}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Plan Your Trip</Text>
                <Text style={styles.headerSubtitle}>Let AI create your perfect itinerary</Text>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Budget Section */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="cash-outline" size={24} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Budget</Text>
                    </View>
                    <Text style={styles.valueDisplay}>LKR {budget.toLocaleString()}</Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={50000}
                        maximumValue={500000}
                        step={10000}
                        value={budget}
                        onValueChange={setBudget}
                        minimumTrackTintColor={Colors.primary}
                        maximumTrackTintColor={Colors.border}
                        thumbTintColor={Colors.primary}
                    />
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderLabel}>50K</Text>
                        <Text style={styles.sliderLabel}>500K</Text>
                    </View>
                </View>

                {/* Days Section */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Duration</Text>
                    </View>
                    <Text style={styles.valueDisplay}>{days} {days === 1 ? 'Day' : 'Days'}</Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={1}
                        maximumValue={14}
                        step={1}
                        value={days}
                        onValueChange={setDays}
                        minimumTrackTintColor={Colors.primary}
                        maximumTrackTintColor={Colors.border}
                        thumbTintColor={Colors.primary}
                    />
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderLabel}>1 Day</Text>
                        <Text style={styles.sliderLabel}>14 Days</Text>
                    </View>
                </View>

                {/* Travelers Section */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="people-outline" size={24} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Number of Travelers</Text>
                    </View>
                    <View style={styles.stepperContainer}>
                        <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => setTravelers(Math.max(1, travelers - 1))}
                        >
                            <Ionicons name="remove" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{travelers}</Text>
                        <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => setTravelers(Math.min(10, travelers + 1))}
                        >
                            <Ionicons name="add" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Distance Preference */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="car-outline" size={24} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Max Travel Distance</Text>
                    </View>
                    <Text style={styles.valueDisplay}>{distance} km</Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={50}
                        maximumValue={300}
                        step={10}
                        value={distance}
                        onValueChange={setDistance}
                        minimumTrackTintColor={Colors.primary}
                        maximumTrackTintColor={Colors.border}
                        thumbTintColor={Colors.primary}
                    />
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderLabel}>50 km</Text>
                        <Text style={styles.sliderLabel}>300 km</Text>
                    </View>
                </View>

                {/* Activity Type */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="compass-outline" size={24} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Activity Preference</Text>
                    </View>
                    <View style={styles.activityGrid}>
                        {activityTypes.map((activity) => (
                            <TouchableOpacity
                                key={activity.value}
                                style={[
                                    styles.activityButton,
                                    activityType === activity.value && styles.activityButtonActive,
                                ]}
                                onPress={() => setActivityType(activity.value)}
                            >
                                <Ionicons
                                    name={activity.icon}
                                    size={24}
                                    color={activityType === activity.value ? Colors.surface : Colors.primary}
                                />
                                <Text
                                    style={[
                                        styles.activityButtonText,
                                        activityType === activity.value && styles.activityButtonTextActive,
                                    ]}
                                >
                                    {activity.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Season */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="rainy-outline" size={24} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Travel Season</Text>
                    </View>
                    {seasons.map((s) => (
                        <TouchableOpacity
                            key={s.value}
                            style={[
                                styles.seasonButton,
                                season === s.value && styles.seasonButtonActive,
                            ]}
                            onPress={() => setSeason(s.value)}
                        >
                            <Text
                                style={[
                                    styles.seasonButtonText,
                                    season === s.value && styles.seasonButtonTextActive,
                                ]}
                            >
                                {s.label}
                            </Text>
                            {season === s.value && (
                                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Starting Location */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="location-outline" size={24} color={Colors.primary} />
                        <Text style={styles.cardTitle}>Starting Location</Text>
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter starting city"
                        value={startLocation}
                        onChangeText={setStartLocation}
                    />
                </View>

                {/* Generate Button */}
                <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
                    <LinearGradient
                        colors={[Colors.primary, Colors.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.generateButtonGradient}
                    >
                        <Ionicons name="sparkles" size={24} color={Colors.surface} />
                        <Text style={styles.generateButtonText}>Generate Itinerary</Text>
                    </LinearGradient>
                </TouchableOpacity>
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
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },
    card: {
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
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginLeft: Spacing.sm,
    },
    valueDisplay: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: Spacing.sm,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sliderLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.lg,
    },
    stepperButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.primary,
        minWidth: 60,
        textAlign: 'center',
    },
    activityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    activityButton: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.border,
    },
    activityButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    activityButtonText: {
        fontSize: 12,
        color: Colors.text,
        fontWeight: '600',
        marginTop: Spacing.xs,
    },
    activityButtonTextActive: {
        color: Colors.surface,
    },
    seasonButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    seasonButtonActive: {
        backgroundColor: Colors.primary + '20',
        borderColor: Colors.primary,
    },
    seasonButtonText: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
    },
    seasonButtonTextActive: {
        color: Colors.primary,
        fontWeight: '600',
    },
    input: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    generateButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginTop: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    generateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    generateButtonText: {
        color: Colors.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
});