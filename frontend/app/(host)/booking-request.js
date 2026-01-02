import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Alert, 
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

const { width } = Dimensions.get('window');

/**
 * BookingRequestsScreen: Host-side interface to manage incoming cultural experience requests.
 * Features: Tab-based filtering (Pending, Confirmed, History), Accept/Decline actions.
 */
export default function BookingRequestsScreen() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // Current active filter
    const router = useRouter();

    /**
     * fetchBookings: Retrieves all booking requests assigned to the logged-in Host.
     */
    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/bookings/host/list');
            setBookings(response.data);
        } catch (err) {
            console.error("Fetch Error:", err);
            Alert.alert("Error", "Failed to fetch bookings. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Load data on initial mount
    useEffect(() => { fetchBookings(); }, []);

    /**
     * filteredBookings: Memoized list filtered by the active tab status.
     * Note: 'History' tab merges all cancellation variations.
     */
    const filteredBookings = useMemo(() => {
        if (activeTab === 'cancelled') {
            return bookings.filter(b => 
                b.status === 'cancelled_by_host' || 
                b.status === 'cancelled_by_tourist' || 
                b.status === 'cancelled'
            );
        }
        return bookings.filter(b => b.status === activeTab);
    }, [bookings, activeTab]);

    /**
     * handleAction: Updates booking status via API.
     * Confirmation alert prevents accidental Accept/Decline taps.
     */
    const handleAction = async (id, status) => {
        const actionLabel = status === 'confirmed' ? 'Accept' : 'Decline';
        
        Alert.alert(
            `${actionLabel} Request`,
            `Are you sure you want to ${actionLabel.toLowerCase()} this booking request?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Confirm", 
                    onPress: async () => {
                        try {
                            await api.patch(`/bookings/update-status/${id}`, { status });
                            Alert.alert("Success", `Booking request ${actionLabel}ed successfully.`);
                            fetchBookings(); // Refresh data from server
                        } catch (err) {
                            Alert.alert("Error", "Could not update status. Please check your connection.");
                        }
                    }
                }
            ]
        );
    };

    /**
     * getStatusTheme: Returns visual properties (colors, icons) based on booking status.
     */
    const getStatusTheme = (status) => {
        switch (status) {
            case 'confirmed': 
                return { color: '#2E7D32', icon: 'checkmark-circle', bg: '#E8F5E9', label: 'Accepted' };
            case 'cancelled_by_host': 
                return { color: '#D32F2F', icon: 'close-circle', bg: '#FFEBEE', label: 'Declined by You' };
            case 'cancelled_by_tourist': 
                return { color: '#546E7A', icon: 'person-remove', bg: '#ECEFF1', label: 'Cancelled by Tourist' };
            default: 
                return { color: '#757575', icon: 'help-circle', bg: '#F5F5F5', label: 'Cancelled' };
        }
    };

    /**
     * renderItem: Renders individual booking request cards.
     */
    const renderItem = ({ item }) => {
        const theme = getStatusTheme(item.status);

        return (
            <View style={styles.cardContainer}>
                <View style={styles.card}>
                    {/* Header: Tourist Profile and Booking Price */}
                    <View style={styles.cardHeader}>
                        <View style={styles.touristInfo}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.touristName?.charAt(0) || 'T'}</Text>
                            </View>
                            <View>
                                <Text style={styles.touristName}>{item.touristName}</Text>
                                <Text style={styles.requestDate}>Requested on {new Date(item.createdAt).toLocaleDateString('en-GB')}</Text>
                            </View>
                        </View>
                        <Text style={styles.priceText}>LKR {item.totalPrice?.toLocaleString()}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Body: Experience Title and Details */}
                    <View style={styles.cardBody}>
                        <Text style={styles.expTitle}>{item.experience?.title || "Experience Heritage"}</Text>
                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                                <Text style={styles.detailText}>{new Date(item.bookingDate).toLocaleDateString('en-GB')}</Text>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.detailItem}>
                                <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                                <Text style={styles.detailText}>{item.guests} Guests</Text>
                            </View>
                        </View>
                    </View>

                    {/* Footer Actions: Shown only for Pending status */}
                    {item.status === 'pending' && (
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity 
                                style={[styles.actionBtn, styles.declineBtn]} 
                                onPress={() => handleAction(item._id, 'cancelled')}
                            >
                                <Text style={styles.declineBtnText}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionBtn, styles.acceptBtn]} 
                                onPress={() => handleAction(item._id, 'confirmed')}
                            >
                                <Text style={styles.acceptBtnText}>Accept Request</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    
                    {/* Status Footer: Shown for Confirmed/History statuses */}
                    {item.status !== 'pending' && (
                        <View style={[styles.statusFooter, { backgroundColor: theme.bg }]}>
                            <Ionicons name={theme.icon} size={16} color={theme.color} />
                            <Text style={[styles.statusFooterText, { color: theme.color }]}>
                                {theme.label}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    /**
     * TabButton: Reusable sub-component for the status filter bar.
     */
    const TabButton = ({ title, type }) => (
        <TouchableOpacity 
            style={[styles.tab, activeTab === type && styles.activeTab]}
            onPress={() => setActiveTab(type)}
            activeOpacity={0.7}
        >
            <Text style={[styles.tabText, activeTab === type && styles.activeTabText]}>{title}</Text>
            {activeTab === type && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Main Premium Header with Green Gradient */}
            <LinearGradient colors={[Colors.primary, '#08320A']} style={styles.header}>
                <View style={styles.headerInner}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Booking Requests</Text>
                        <Text style={styles.headerSubtitle}>Manage incoming experiences</Text>
                    </View>
                    <TouchableOpacity onPress={fetchBookings} style={styles.refreshBtn}>
                        <Ionicons name="refresh" size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Filter Navigation Bar */}
            <View style={styles.tabBar}>
                <TabButton title="Pending" type="pending" />
                <TabButton title="Confirmed" type="confirmed" />
                <TabButton title="History" type="cancelled" />
            </View>

            {/* Data Display Area */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="calendar-outline" size={60} color={Colors.border} />
                            </View>
                            <Text style={styles.emptyText}>No {activeTab} requests found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // --- MAIN LAYOUT ---
    container: { 
        flex: 1, 
        backgroundColor: '#F8F9FA' 
    },
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    
    // --- HEADER STYLES (GRADIENT) ---
    header: { 
        paddingTop: 60, 
        paddingBottom: 25, 
        paddingHorizontal: 20 
    },
    headerInner: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
    },
    headerTitleContainer: { 
        flex: 1, 
        marginLeft: 15 
    },
    headerTitle: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: 'white' 
    },
    headerSubtitle: { 
        fontSize: 13, 
        color: 'rgba(255,255,255,0.7)', 
        marginTop: 2 
    },
    backBtn: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: 'rgba(255,255,255,0.15)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    refreshBtn: { 
        padding: 5 
    },
    
    // --- TAB BAR STYLES ---
    tabBar: { 
        flexDirection: 'row', 
        backgroundColor: 'white', 
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    tab: { 
        flex: 1, 
        alignItems: 'center', 
        paddingVertical: 16, 
        position: 'relative' 
    },
    tabText: { 
        fontSize: 14, 
        color: '#9E9E9E', 
        fontWeight: '600' 
    },
    activeTabText: { 
        color: Colors.primary, 
        fontWeight: 'bold' 
    },
    tabIndicator: { 
        position: 'absolute', 
        bottom: 0, 
        width: '40%', 
        height: 3, 
        backgroundColor: Colors.primary, 
        borderRadius: 3 
    },

    // --- CARD CONTAINER & SHADOWS ---
    listContent: { 
        padding: 16, 
        paddingBottom: 40 
    },
    cardContainer: {
        marginBottom: 16,
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, 
        shadowRadius: 8, 
        elevation: 3,
    },
    card: { 
        backgroundColor: 'white', 
        borderRadius: 16, 
        overflow: 'hidden',
        borderWidth: 1, 
        borderColor: '#F1F1F1'
    },

    // --- CARD CONTENT ELEMENTS ---
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 16 
    },
    touristInfo: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12 
    },
    avatar: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        backgroundColor: Colors.primary + '20', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    avatarText: { 
        color: Colors.primary, 
        fontWeight: 'bold', 
        fontSize: 18 
    },
    touristName: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: Colors.text 
    },
    requestDate: { 
        fontSize: 12, 
        color: '#9E9E9E', 
        marginTop: 2 
    },
    priceText: { 
        fontSize: 15, 
        fontWeight: 'bold', 
        color: Colors.secondary 
    },
    divider: { 
        height: 1, 
        backgroundColor: '#F5F5F5', 
        marginHorizontal: 16 
    },
    cardBody: { 
        padding: 16 
    },
    expTitle: { 
        fontSize: 15, 
        fontWeight: 'bold', 
        color: '#424242', 
        marginBottom: 8 
    },
    detailsRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12 
    },
    detailItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4 
    },
    detailText: { 
        fontSize: 13, 
        color: '#616161', 
        fontWeight: '500' 
    },
    verticalDivider: { 
        width: 1, 
        height: 12, 
        backgroundColor: '#E0E0E0' 
    },

    // --- ACTION BUTTONS (PENDING ONLY) ---
    actionsContainer: { 
        flexDirection: 'row', 
        padding: 16, 
        gap: 12, 
        backgroundColor: '#FAFAFA',
        borderTopWidth: 1, 
        borderTopColor: '#F5F5F5'
    },
    actionBtn: { 
        flex: 1, 
        paddingVertical: 12, 
        borderRadius: 10, 
        alignItems: 'center' 
    },
    acceptBtn: { 
        backgroundColor: Colors.primary 
    },
    declineBtn: { 
        backgroundColor: 'white', 
        borderWidth: 1, 
        borderColor: '#E0E0E0' 
    },
    acceptBtnText: { 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: 14 
    },
    declineBtnText: { 
        color: '#757575', 
        fontWeight: 'bold', 
        fontSize: 14 
    },

    // --- STATUS FOOTER (CONFIRMED/HISTORY) ---
    statusFooter: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 14, 
        gap: 8 
    },
    statusFooterText: { 
        fontSize: 13, 
        fontWeight: 'bold', 
        textTransform: 'uppercase', 
        letterSpacing: 0.5 
    },

    // --- EMPTY STATE STYLES ---
    emptyContainer: { 
        alignItems: 'center', 
        marginTop: 100, 
        paddingHorizontal: 40 
    },
    emptyIconCircle: {
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        backgroundColor: 'white',
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 20,
        borderWidth: 1, 
        borderColor: '#E0E0E0'
    },
    emptyText: { 
        fontSize: 16, 
        color: '#9E9E9E', 
        fontWeight: '500', 
        textAlign: 'center' 
    }
});