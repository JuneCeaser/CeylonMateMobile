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
    Alert,
    Dimensions
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

const { width } = Dimensions.get('window');

/**
 * MyBookingsScreen: Allows tourists to view their cultural booking history
 * with clean, professionally styled status indicators.
 */
export default function MyBookingsScreen() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter(); 

    const fetchMyBookings = async () => {
        try {
            const response = await api.get('/bookings/tourist/my-list');
            setBookings(response.data);
        } catch (error) {
            console.error("Fetch bookings error:", error);
            Alert.alert("Connection Error", "Could not refresh your booking list.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCancelBooking = (bookingId) => {
        Alert.alert(
            "Cancel Booking",
            "Are you sure you want to cancel this booking request?",
            [
                { text: "No, Keep it", style: "cancel" },
                { 
                    text: "Yes, Cancel", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.patch(`/bookings/update-status/${bookingId}`, { status: 'cancelled' });
                            fetchMyBookings(); 
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

    /**
     * getStatusTheme: Enhanced styling for status labels.
     * Uses soft pastel backgrounds and professional iconography.
     */
    const getStatusTheme = (status) => {
        switch (status) {
            case 'confirmed': 
                return { color: '#2E7D32', icon: 'checkmark-circle', bg: '#E8F5E9', label: 'Confirmed' };
            case 'pending': 
                return { color: '#EF6C00', icon: 'time', bg: '#FFF3E0', label: 'Pending Approval' }; 
            case 'cancelled_by_tourist': 
                return { color: '#546E7A', icon: 'person-remove', bg: '#ECEFF1', label: 'Cancelled by You' };
            case 'cancelled_by_host': 
                return { color: '#C62828', icon: 'close-circle', bg: '#FFEBEE', label: 'Rejected by Host' };
            case 'completed': 
                return { color: Colors.primary, icon: 'ribbon', bg: '#F1F8E9', label: 'Completed' };
            default: 
                return { color: Colors.textSecondary, icon: 'help-circle', bg: '#F5F5F5', label: status };
        }
    };

    const renderBookingItem = ({ item }) => {
        const theme = getStatusTheme(item.status);
        
        return (
            <View style={styles.cardContainer}>
                <View style={styles.card}>
                    <View style={styles.cardTop}>
                        {/* Image is now clear without overlaps */}
                        <Image 
                            source={{ uri: item.experience?.images?.[0] || 'https://via.placeholder.com/150' }} 
                            style={styles.experienceImage} 
                        />

                        <View style={styles.contentRight}>
                            {/* --- RE-STYLED STATUS BADGE --- */}
                            <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}>
                                <Ionicons name={theme.icon} size={12} color={theme.color} />
                                <Text style={[styles.statusLabelText, { color: theme.color }]}>{theme.label}</Text>
                            </View>

                            <Text style={styles.experienceTitle} numberOfLines={1}>
                                {item.experience?.title || 'Experience Heritage'}
                            </Text>
                            
                            <View style={styles.hostRow}>
                                <Ionicons name="person-outline" size={12} color={Colors.primary} />
                                <Text style={styles.hostName}>Host: {item.hostName || 'Verified Host'}</Text>
                            </View>

                            <View style={styles.dateContainer}>
                                <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                                <Text style={styles.dateText}>
                                    {new Date(item.bookingDate).toLocaleDateString('en-GB')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardBottom}>
                        <View>
                            <Text style={styles.totalLabel}>Grand Total</Text>
                            <Text style={styles.totalValue}>LKR {item.totalPrice?.toLocaleString()}</Text>
                        </View>
                        <View style={styles.guestCountPill}>
                            <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                            <Text style={styles.guestCountText}>{item.guests} {item.guests > 1 ? 'Guests' : 'Guest'}</Text>
                        </View>
                    </View>

                    {item.status === 'pending' && (
                        <TouchableOpacity 
                            style={styles.cancelButton} 
                            onPress={() => handleCancelBooking(item._id)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel Request</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* --- FLAT HEADER WITH BACK NAVIGATION --- */}
            <LinearGradient colors={[Colors.primary, '#08320A']} style={styles.header}>
                <View style={styles.headerInner}>
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={() => router.push('/(tourist)/culture')}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>My Cultural Booking List</Text>
                        <Text style={styles.headerSubtitle}>Manage your cultural journeys</Text>
                    </View>
                    <Ionicons name="receipt-outline" size={30} color="rgba(255,255,255,0.2)" />
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item._id}
                    renderItem={renderBookingItem}
                    contentContainerStyle={styles.listPadding}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyBookings(); }} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="calendar-outline" size={50} color={Colors.border} />
                            </View>
                            <Text style={styles.emptyTitle}>No bookings found</Text>
                            <TouchableOpacity onPress={() => router.push('/(tourist)/culture')}>
                                <Text style={styles.browseLink}>Browse Authentic Experiences →</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // --- LAYOUT ---
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    loader: { flex: 1, justifyContent: 'center' },
    listPadding: { padding: 16, paddingBottom: 40 },

    // --- HEADER ---
    header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20 },
    headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, marginLeft: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    // --- CARD DESIGN ---
    cardContainer: { marginBottom: 16 },
    card: { 
        backgroundColor: 'white', 
        borderRadius: 20, 
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F1F1'
    },
    cardTop: { flexDirection: 'row' },
    experienceImage: { width: 90, height: 90, borderRadius: 15, backgroundColor: '#F3F4F6' },
    contentRight: { flex: 1, marginLeft: 15 },

    // --- CLEAN STATUS BADGE ---
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 8,
        gap: 4
    },
    statusLabelText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },

    experienceTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 6 },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    hostName: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
    dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 13, color: '#6B7280' },

    // --- FOOTER ELEMENTS ---
    cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
    guestCountPill: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F9FAFB', 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 8, 
        gap: 5 
    },
    guestCountText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },

    // --- BUTTONS ---
    cancelButton: { 
        marginTop: 15, 
        paddingVertical: 10, 
        borderRadius: 12, 
        backgroundColor: '#FFF5F5', 
        alignItems: 'center' 
    },
    cancelButtonText: { color: '#DC2626', fontWeight: 'bold', fontSize: 13 },

    // --- EMPTY STATE ---
    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 30 },
    emptyIconCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'white', justifyContent: 'center', alignItems: 'center',
        marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB'
    },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
    browseLink: { color: Colors.primary, fontWeight: 'bold', fontSize: 15 }
});