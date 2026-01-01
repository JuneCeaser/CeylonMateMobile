import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    Image, 
    ActivityIndicator, 
    RefreshControl,
    TouchableOpacity,
    Alert
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function MyBookingsScreen() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    /**
     * Fetch bookings specifically for the logged-in tourist
     */
    const fetchMyBookings = async () => {
        try {
            // Ensure this matches your backend route
            const response = await api.get('/bookings/tourist/my-list');
            setBookings(response.data);
        } catch (error) {
            console.error("Fetch bookings error:", error);
            Alert.alert("Error", "Could not load your bookings. Please try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /**
     * Handle Booking Cancellation (Only for Pending)
     */
    const handleCancelBooking = (bookingId) => {
        Alert.alert(
            "Cancel Booking",
            "Are you sure you want to cancel this heritage journey?",
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Cancel", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // PATCH request to update status to cancelled
                            await api.patch(`/bookings/update-status/${bookingId}`, { status: 'cancelled' });
                            fetchMyBookings(); // Refresh list
                        } catch (error) {
                            Alert.alert("Error", "Failed to cancel booking.");
                        }
                    }
                }
            ]
        );
    };

    useFocusEffect(
        useCallback(() => {
            fetchMyBookings();
        }, [])
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return Colors.success;
            case 'pending': return '#FFA000'; 
            case 'cancelled': return Colors.danger;
            case 'completed': return Colors.primary;
            default: return Colors.textSecondary;
        }
    };

    const renderBookingItem = ({ item }) => (
        <View style={styles.card}>
            {/* Experience Image */}
            <Image 
                source={{ uri: item.experience?.images?.[0] || 'https://via.placeholder.com/150' }} 
                style={styles.image} 
            />
            
            <View style={styles.details}>
                <Text style={styles.title} numberOfLines={1}>
                    {item.experience?.title || 'Experience Heritage'}
                </Text>
                
                {/* Displaying Host Name from the populated/saved data */}
                <Text style={styles.hostName}>By: {item.hostName || 'Local Host'}</Text>
                
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                    <Text style={styles.dateText}>
                        {new Date(item.bookingDate).toLocaleDateString()}
                    </Text>
                </View>
                
                <View style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
                    </View>

                    {/* Show Cancel Button only if Pending */}
                    {item.status === 'pending' && (
                        <TouchableOpacity onPress={() => handleCancelBooking(item._id)}>
                            <Text style={styles.cancelLink}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.priceContainer}>
                <Text style={styles.price}>LKR {item.totalPrice?.toLocaleString()}</Text>
                <Text style={styles.guests}>{item.guests} Guests</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header section with Green Gradient & Flat Corners */}
            <LinearGradient
                colors={[Colors.primary, '#1B5E20']} 
                style={styles.header}
            >
                <Text style={styles.headerTitle}>My Cultural Booking List</Text>
                <Text style={styles.headerSubtitle}>Track your cultural experience bookings</Text>
            </LinearGradient>

            <FlatList
                data={bookings}
                keyExtractor={(item) => item._id}
                renderItem={renderBookingItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={() => { setRefreshing(true); fetchMyBookings(); }} 
                        colors={[Colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={80} color={Colors.border} />
                        <Text style={styles.emptyText}>No journeys found.</Text>
                        <Text style={styles.emptySubText}>Book an authentic Sri Lankan experience to see it here!</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    // --- Main Layout ---
    container: { 
        flex: 1, 
        backgroundColor: Colors.background 
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },

    // --- Header Section ---
    header: { 
        padding: Spacing.lg, 
        paddingTop: 60, 
        paddingBottom: Spacing.xl,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    headerTitle: { 
        ...Typography.h2, 
        color: 'white' 
    },
    headerSubtitle: { 
        color: 'white', 
        opacity: 0.8, 
        fontSize: 13, 
        marginTop: 4 
    },

    // --- List & Card Section ---
    list: { 
        padding: Spacing.md, 
        paddingBottom: 100 
    },
    card: { 
        flexDirection: 'row', 
        backgroundColor: 'white', 
        borderRadius: BorderRadius.md, 
        padding: 12, 
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        alignItems: 'center'
    },
    image: { 
        width: 85, 
        height: 85, 
        borderRadius: BorderRadius.sm, 
        backgroundColor: '#f0f0f0' 
    },
    details: { 
        flex: 1, 
        marginLeft: 15 
    },
    title: { 
        fontWeight: 'bold', 
        fontSize: 16, 
        color: Colors.text 
    },
    hostName: { 
        fontSize: 12, 
        color: Colors.textSecondary, 
        marginBottom: 4 
    },
    infoRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 5, 
        marginBottom: 8 
    },
    dateText: { 
        fontSize: 12, 
        color: Colors.textSecondary 
    },

    // --- Status & Cancellation ---
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    statusBadge: { 
        paddingHorizontal: 10, 
        paddingVertical: 3, 
        borderRadius: 6 
    },
    statusText: { 
        fontSize: 9, 
        color: 'white', 
        fontWeight: 'bold' 
    },
    cancelLink: {
        color: Colors.danger,
        fontSize: 12,
        fontWeight: '600',
        textDecorationLine: 'underline'
    },

    // --- Price Section ---
    priceContainer: { 
        alignItems: 'flex-end', 
        justifyContent: 'center', 
        paddingLeft: 10 
    },
    price: { 
        fontWeight: 'bold', 
        color: Colors.primary, 
        fontSize: 14 
    },
    guests: { 
        fontSize: 11, 
        color: Colors.textSecondary, 
        marginTop: 2 
    },

    // --- Empty State ---
    emptyContainer: { 
        alignItems: 'center', 
        marginTop: 100, 
        paddingHorizontal: 40 
    },
    emptyText: { 
        marginTop: 15, 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: Colors.text 
    },
    emptySubText: { 
        marginTop: 5, 
        textAlign: 'center', 
        color: Colors.textSecondary 
    }
});