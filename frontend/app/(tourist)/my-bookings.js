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
    Dimensions,
    Platform
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router'; 
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import api from '../../constants/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

/**
 * MyBookingsScreen: Displays a clean, card-based history of cultural bookings
 * with intuitive status badges and action buttons.
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

    const getStatusTheme = (status) => {
        switch (status) {
            case 'confirmed': 
                return { color: '#2E7D32', icon: 'check-decagram', bg: '#E8F5E9', label: 'Confirmed' };
            case 'pending': 
                return { color: '#EF6C00', icon: 'clock-outline', bg: '#FFF3E0', label: 'Pending' }; 
            case 'cancelled_by_tourist': 
                return { color: '#546E7A', icon: 'account-remove', bg: '#ECEFF1', label: 'You Cancelled' };
            case 'cancelled_by_host': 
                return { color: '#D32F2F', icon: 'close-octagon', bg: '#FFEBEE', label: 'Host Declined' };
            case 'completed': 
                return { color: '#1565C0', icon: 'star-circle', bg: '#E3F2FD', label: 'Completed' };
            default: 
                return { color: '#757575', icon: 'help-circle', bg: '#F5F5F5', label: status };
        }
    };

    const renderBookingItem = ({ item }) => {
        const theme = getStatusTheme(item.status);
        const bookingDate = new Date(item.bookingDate);
        
        return (
            <View style={styles.bookingCard}>
                <View style={styles.cardMain}>
                    <Image 
                        source={{ uri: item.experience?.images?.[0] || 'https://via.placeholder.com/150' }} 
                        style={styles.experienceImage} 
                    />
                    <View style={styles.infoContainer}>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}>
                                <MaterialCommunityIcons name={theme.icon} size={14} color={theme.color} />
                                <Text style={[styles.statusText, { color: theme.color }]}>{theme.label}</Text>
                            </View>
                        </View>
                        
                        <Text style={styles.titleText} numberOfLines={1}>
                            {item.experience?.title || 'Cultural Experience'}
                        </Text>
                        
                        <View style={styles.detailRow}>
                            <Ionicons name="person-circle-outline" size={14} color="#666" />
                            <Text style={styles.detailText}>Host: {item.hostName || 'Local Expert'}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Ionicons name="calendar-clear-outline" size={14} color="#666" />
                            <Text style={styles.detailText}>
                                {bookingDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {'  •  '}
                                {bookingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.priceLabel}>Amount Paid / Due</Text>
                        <Text style={styles.priceValue}>LKR {item.totalPrice?.toLocaleString()}</Text>
                    </View>
                    <View style={styles.guestPill}>
                        <Ionicons name="people" size={14} color="#555" />
                        <Text style={styles.guestText}>{item.guests} {item.guests > 1 ? 'Guests' : 'Guest'}</Text>
                    </View>
                </View>

                {item.status === 'pending' && (
                    <TouchableOpacity 
                        style={styles.cancelAction} 
                        onPress={() => handleCancelBooking(item._id)}
                    >
                        <Text style={styles.cancelActionText}>Cancel Booking</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.topHeader}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.replace('/(tourist)/culture')} style={styles.iconCircle}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleWrap}>
                        <Text style={styles.mainTitle}>My Bookings</Text>
                        <Text style={styles.subTitle}>{bookings.length} reservations found</Text>
                    </View>
                    <MaterialCommunityIcons name="ticket-confirmation-outline" size={28} color="rgba(255,255,255,0.3)" />
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                </View>
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item._id}
                    renderItem={renderBookingItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyBookings(); }} tintColor="#2E7D32" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Image 
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076432.png' }} 
                                style={styles.emptyImg} 
                            />
                            <Text style={styles.emptyText}>No bookings yet</Text>
                            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tourist)/culture')}>
                                <Text style={styles.exploreBtnText}>Explore Experiences</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FBFA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Header Styling
    topHeader: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 25, paddingHorizontal: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    titleWrap: { flex: 1, marginLeft: 15 },
    mainTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    subTitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    // List & Card Styling
    listContainer: { padding: 16, paddingBottom: 100 },
    bookingCard: { 
        backgroundColor: 'white', 
        borderRadius: 24, 
        padding: 16, 
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    cardMain: { flexDirection: 'row', alignItems: 'center' },
    experienceImage: { width: 85, height: 85, borderRadius: 18, backgroundColor: '#F0F0F0' },
    infoContainer: { flex: 1, marginLeft: 15 },
    statusRow: { marginBottom: 6 },
    statusBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        alignSelf: 'flex-start', 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 10,
        gap: 5
    },
    statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
    titleText: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 5 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    detailText: { fontSize: 12, color: '#666', fontWeight: '500' },

    // Footer & Divider
    divider: { height: 1, backgroundColor: '#F1F1F1', marginVertical: 15 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase', fontWeight: '600' },
    priceValue: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
    guestPill: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F5F5F5', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 12,
        gap: 6
    },
    guestText: { fontSize: 12, fontWeight: '700', color: '#444' },

    // Actions
    cancelAction: { 
        marginTop: 15, 
        backgroundColor: '#FFF5F5', 
        paddingVertical: 12, 
        borderRadius: 15, 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFEBEB'
    },
    cancelActionText: { color: '#E53935', fontWeight: 'bold', fontSize: 13 },

    // Empty State
    emptyWrap: { alignItems: 'center', marginTop: 80 },
    emptyImg: { width: 120, height: 120, opacity: 0.5, marginBottom: 20 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#CCC', marginBottom: 20 },
    exploreBtn: { backgroundColor: '#2E7D32', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 20 },
    exploreBtnText: { color: 'white', fontWeight: 'bold' }
});