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
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

const { width } = Dimensions.get('window');

/**
 * BookingRequestsScreen: Host view to manage pending, confirmed, and cancelled requests.
 */
export default function BookingRequestsScreen() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // Options: 'pending', 'confirmed', 'cancelled'
    const router = useRouter();

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/bookings/host/list');
            setBookings(response.data);
        } catch (err) {
            Alert.alert("Error", "Failed to fetch bookings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBookings(); }, []);

    /**
     * Filter Logic: 
     * 'cancelled' tab now includes both 'cancelled_by_host' and 'cancelled_by_tourist'
     */
    const filteredBookings = useMemo(() => {
        if (activeTab === 'cancelled') {
            return bookings.filter(b => b.status === 'cancelled_by_host' || b.status === 'cancelled_by_tourist' || b.status === 'cancelled');
        }
        return bookings.filter(b => b.status === activeTab);
    }, [bookings, activeTab]);

    /**
     * handleAction: Updates status. 
     * Backend automatically maps 'cancelled' to 'cancelled_by_host' because the Host is logged in.
     */
    const handleAction = async (id, status) => {
        const actionLabel = status === 'confirmed' ? 'Accept' : 'Decline';
        
        Alert.alert(
            `${actionLabel} Booking`,
            `Are you sure you want to ${actionLabel.toLowerCase()} this request?`,
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes", 
                    onPress: async () => {
                        try {
                            await api.patch(`/bookings/update-status/${id}`, { status });
                            Alert.alert("Success", `Booking ${status === 'confirmed' ? 'Accepted' : 'Declined'}`);
                            fetchBookings(); 
                        } catch (err) {
                            Alert.alert("Error", "Failed to update status");
                        }
                    }
                }
            ]
        );
    };

    /**
     * getStatusStyle: Helper to provide correct labels and colors for the Host view
     */
    const getStatusStyle = (status) => {
        switch (status) {
            case 'confirmed': return { label: 'Accepted', color: Colors.success, icon: 'checkmark-circle' };
            case 'cancelled_by_host': return { label: 'Declined by You', color: Colors.danger, icon: 'close-circle' };
            case 'cancelled_by_tourist': return { label: 'Cancelled by Tourist', color: '#757575', icon: 'person-remove' };
            default: return { label: 'Cancelled', color: Colors.danger, icon: 'close-circle' };
        }
    };

    const renderItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.touristInfo}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{item.touristName?.charAt(0) || 'T'}</Text>
                        </View>
                        <View>
                            <Text style={styles.touristName}>{item.touristName}</Text>
                            <Text style={styles.timeAgo}>Requested on {new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>
                    <Text style={styles.priceText}>LKR {item.totalPrice?.toLocaleString()}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardBody}>
                    <Text style={styles.expTitle}>{item.experience?.title || "Experience Details N/A"}</Text>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={14} color="#666" />
                        <Text style={styles.details}> {new Date(item.bookingDate).toLocaleDateString()}</Text>
                        <View style={styles.dot} />
                        <Ionicons name="people-outline" size={14} color="#666" />
                        <Text style={styles.details}> {item.guests} Guests</Text>
                    </View>
                </View>

                {/* SHOW ACTION BUTTONS ONLY IN PENDING TAB */}
                {item.status === 'pending' && (
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.declineBtn]} 
                            onPress={() => handleAction(item._id, 'cancelled')}
                        >
                            <Text style={styles.declineBtnText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.confirmBtn]} 
                            onPress={() => handleAction(item._id, 'confirmed')}
                        >
                            <Text style={styles.confirmBtnText}>Accept Request</Text>
                        </TouchableOpacity>
                    </View>
                )}
                
                {/* SHOW FOOTER STATUS FOR CONFIRMED/CANCELLED TABS */}
                {item.status !== 'pending' && (
                    <View style={[styles.statusFooter, { backgroundColor: statusStyle.color + '15' }]}>
                        <Ionicons name={statusStyle.icon} size={16} color={statusStyle.color} />
                        <Text style={[styles.statusFooterText, { color: statusStyle.color }]}>
                            {statusStyle.label}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const TabButton = ({ title, type }) => (
        <TouchableOpacity 
            style={[styles.tab, activeTab === type && styles.activeTab]}
            onPress={() => setActiveTab(type)}
        >
            <Text style={[styles.tabText, activeTab === type && styles.activeTabText]}>{title}</Text>
            {activeTab === type && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Requests</Text>
                <TouchableOpacity onPress={fetchBookings}>
                    <Ionicons name="refresh" size={22} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Tabs Section */}
            <View style={styles.tabBar}>
                <TabButton title="Pending" type="pending" />
                <TabButton title="Confirmed" type="confirmed" />
                <TabButton title="History" type="cancelled" />
            </View>

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
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No {activeTab} bookings found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingTop: 60, 
        paddingBottom: 15,
        backgroundColor: 'white' 
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
    backBtn: { padding: 5 },
    
    // Tab Styles
    tabBar: { flexDirection: 'row', backgroundColor: 'white', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 15, position: 'relative' },
    tabText: { fontSize: 14, color: '#888', fontWeight: '500' },
    activeTabText: { color: Colors.primary, fontWeight: 'bold' },
    tabIndicator: { position: 'absolute', bottom: 0, width: '60%', height: 3, backgroundColor: Colors.primary, borderRadius: 3 },

    listContent: { padding: 15, paddingBottom: 30 },
    card: { backgroundColor: 'white', borderRadius: 15, marginBottom: 15, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
    touristInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    touristName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
    timeAgo: { fontSize: 11, color: '#999' },
    priceText: { fontSize: 15, fontWeight: 'bold', color: Colors.secondary },
    
    divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 15 },
    
    cardBody: { padding: 15 },
    expTitle: { fontSize: 15, fontWeight: '600', color: '#444', marginBottom: 6 },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    details: { fontSize: 13, color: '#666' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ccc', marginHorizontal: 8 },

    actions: { flexDirection: 'row', padding: 15, gap: 10, backgroundColor: '#F9F9F9' },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    confirmBtn: { backgroundColor: Colors.primary },
    declineBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: '#DDD' },
    confirmBtnText: { color: 'white', fontWeight: 'bold' },
    declineBtnText: { color: '#666', fontWeight: 'bold' },

    statusFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
    statusFooterText: { fontSize: 13, fontWeight: 'bold' },

    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, color: '#999', fontSize: 16 }
});