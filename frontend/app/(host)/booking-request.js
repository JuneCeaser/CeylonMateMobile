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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../constants/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function BookingRequestsScreen() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); 
    const router = useRouter();

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/bookings/host/list');
            setBookings(response.data);
        } catch (err) {
            console.error("Fetch Error:", err);
            Alert.alert("Error", "Could not refresh bookings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBookings(); }, []);

    const filteredBookings = useMemo(() => {
        if (activeTab === 'history') {
            // History includes everything EXCEPT pending
            return bookings.filter(b => b.status !== 'pending');
        }
        return bookings.filter(b => b.status === activeTab);
    }, [bookings, activeTab]);

    const handleAction = async (id, status) => {
        const actionLabel = status === 'confirmed' ? 'Accept' : 'Decline';
        Alert.alert(`${actionLabel} Request`, `Proceed with this action?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: async () => {
                try {
                    // status is 'confirmed' or 'cancelled_by_host'
                    await api.patch(`/bookings/update-status/${id}`, { status });
                    fetchBookings(); 
                } catch (err) {
                    Alert.alert("Error", "Failed to update.");
                }
            }}
        ]);
    };

    const getStatusTheme = (status) => {
        switch (status) {
            case 'confirmed': 
                return { color: '#2E7D32', icon: 'check-decagram', bg: '#E8F5E9', label: 'Accepted' };
            case 'completed': 
                return { color: '#1565C0', icon: 'flag-checkered', bg: '#E3F2FD', label: 'Completed' };
            case 'cancelled_by_host': 
                return { color: '#D32F2F', icon: 'close-octagon', bg: '#FFEBEE', label: 'Cancelled by Host' };
            case 'cancelled_by_tourist': 
                return { color: '#D32F2F', icon: 'account-cancel', bg: '#FFEBEE', label: 'Cancelled by Tourist' };
            case 'cancelled': 
                return { color: '#D32F2F', icon: 'close-circle', bg: '#FFEBEE', label: 'Cancelled' };
            default: 
                return { color: '#757575', icon: 'history', bg: '#F5F5F5', label: 'Past Booking' };
        }
    };

    const renderItem = ({ item }) => {
        const theme = getStatusTheme(item.status);

        return (
            <View style={styles.card}>
                <View style={styles.cardTopRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.touristName?.charAt(0)}</Text>
                    </View>
                    <View style={styles.nameContainer}>
                        <Text style={styles.touristName} numberOfLines={1}>{item.touristName}</Text>
                        <Text style={styles.expTitle} numberOfLines={1}>{item.experience?.title}</Text>
                    </View>
                </View>

                <View style={styles.metaRow}>
                    <View style={styles.metaLeft}>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-clear-outline" size={13} color={Colors.primary} />
                            <Text style={styles.metaText}>{new Date(item.bookingDate).toLocaleDateString('en-GB')}</Text>
                        </View>
                        <View style={styles.dot} />
                        <View style={styles.metaItem}>
                            <Ionicons name="people-outline" size={13} color="#666" />
                            <Text style={styles.metaText}>{item.guests} Guests</Text>
                        </View>
                    </View>
                    <Text style={styles.priceText}>LKR {item.totalPrice?.toLocaleString()}</Text>
                </View>

                {item.status === 'pending' ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity 
                            style={[styles.flexBtn, styles.declineBtn]} 
                            onPress={() => handleAction(item._id, 'cancelled_by_host')}
                        >
                            <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.flexBtn, styles.acceptBtn]} 
                            onPress={() => handleAction(item._id, 'confirmed')}
                        >
                            <Text style={styles.acceptText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}>
                        <MaterialCommunityIcons name={theme.icon} size={14} color={theme.color} />
                        <Text style={[styles.statusText, { color: theme.color }]}>{theme.label}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1B5E20', '#0A2A0C']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.roundBackBtn}>
                        <Ionicons name="chevron-back" size={22} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleContent}>
                        <Text style={styles.title}>Bookings</Text>
                        <Text style={styles.subtitle}>Management Portal</Text>
                    </View>
                    <TouchableOpacity onPress={fetchBookings} style={styles.refreshIcon}>
                        <Ionicons name="sync" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.tabContainer}>
                {['pending', 'confirmed', 'history'].map((tab) => (
                    <TouchableOpacity 
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
                    >
                        <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                        {activeTab === tab && <View style={styles.tabDot} />}
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text style={styles.empty}>No bookings in this section</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FBFBFB' },
    header: { paddingTop: 70, paddingBottom: 40, paddingHorizontal: 25 },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    roundBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    titleContent: { flex: 1, marginLeft: 15 },
    title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    refreshIcon: { padding: 5 },

    tabContainer: { flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 20, marginTop: -25, borderRadius: 15, padding: 6, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
    activeTabItem: { backgroundColor: '#F1F8F1' },
    tabLabel: { fontSize: 13, color: '#999', fontWeight: '600' },
    activeTabLabel: { color: Colors.primary, fontWeight: 'bold' },
    tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 4 },

    list: { padding: 15, paddingTop: 25 },
    card: { backgroundColor: 'white', borderRadius: 16, marginBottom: 15, padding: 15, elevation: 2, borderWidth: 1, borderColor: '#F2F2F2' },
    
    cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: Colors.primary, fontWeight: 'bold', fontSize: 16 },
    nameContainer: { flex: 1, marginLeft: 12 },
    touristName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    expTitle: { fontSize: 12, color: '#888', marginTop: 1 },

    metaRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        backgroundColor: '#F9F9F9', 
        paddingVertical: 8, 
        paddingHorizontal: 12,
        borderRadius: 10 
    },
    metaLeft: { flexDirection: 'row', alignItems: 'center' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 11, color: '#555', fontWeight: '500' },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#DDD', marginHorizontal: 10 },
    priceText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

    // Dynamic width buttons that adjust to card
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 15 },
    flexBtn: { flex: 1, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    
    acceptBtn: { backgroundColor: '#E8F5E9' },
    declineBtn: { backgroundColor: '#FFEBEE' },
    acceptText: { color: '#2E7D32', fontSize: 13, fontWeight: '800' },
    declineText: { color: '#D32F2F', fontSize: 13, fontWeight: '800' },

    statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginTop: 12, borderRadius: 10, gap: 8 },
    statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

    loader: { flex: 1, justifyContent: 'center' },
    empty: { textAlign: 'center', color: '#BBB', marginTop: 40, fontSize: 14 }
});