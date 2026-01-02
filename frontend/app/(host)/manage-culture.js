import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Image, 
    Alert, 
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function ManageCultureScreen() {
    const { user, userProfile, authToken } = useAuth(); 
    const router = useRouter();
    
    const [myListings, setMyListings] = useState([]);
    const [bookings, setBookings] = useState([]); 
    const [loading, setLoading] = useState(true);

    const fetchMyListings = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const response = await api.get('/experiences/my/list');
            setMyListings(response.data);
        } catch (_err) {
            console.error("Error fetching host listings");
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    const fetchBookings = useCallback(async () => {
        if (!authToken) return;
        try {
            const response = await api.get('/bookings/host/list');
            setBookings(response.data);
        } catch (err) {
            console.error("Error fetching bookings:", err.message);
        }
    }, [authToken]);

    useFocusEffect(
        useCallback(() => {
            fetchMyListings();
            fetchBookings();
        }, [fetchMyListings, fetchBookings])
    );

    const calculateEarnings = () => {
        return bookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
    };

    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;

    const renderExperienceCard = ({ item }) => (
        <View style={styles.card}>
            <Image 
                source={{ uri: item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/150' }} 
                style={styles.img} 
            />
            <View style={styles.info}>
                <Text style={styles.categoryBadge}>{item.category}</Text>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.price}>LKR {item.price.toLocaleString()}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => router.push({ pathname: '/(host)/add-culture', params: { editId: item._id } })}
                >
                    <Ionicons name="pencil" size={18} color={Colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[Colors.primary, '#1B5E20']} style={styles.headerArea}>
                <View style={styles.headerTopRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.welcomeLabel}>Ayubowan! 🙏</Text>
                        <Text style={styles.hostName}>{userProfile?.name || "Host"}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(host)/profile')}>
                        <Ionicons name="person-circle" size={48} color={Colors.surface} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* --- STATS CARD --- */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{myListings.length}</Text>
                    <Text style={styles.statLabel}>Listings</Text>
                </View>
                <View style={[styles.statItem, styles.statBorder]}>
                    <Text style={[styles.statNumber, { color: Colors.secondary }]}>LKR {calculateEarnings().toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Earnings</Text>
                </View>
                <View style={[styles.statItem, styles.statBorder]}>
                    <Text style={[styles.statNumber, { color: '#FFA000' }]}>{confirmedCount}</Text>
                    <Text style={styles.statLabel}>Confirmed</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                
                {/* --- BOOKING REQUESTS NAVIGATION --- */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Manage Requests</Text>
                </View>
                <TouchableOpacity 
                    style={styles.requestNavBtn}
                    onPress={() => router.push('/(host)/booking-request')}
                >
                    <View style={styles.requestNavInfo}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="calendar" size={24} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.requestNavTitle}>Booking Requests</Text>
                            <Text style={styles.requestNavSubtitle}>{pendingCount} requests waiting for approval</Text>
                        </View>
                    </View>
                    <View style={styles.badgeContainer}>
                        {pendingCount > 0 && (
                            <View style={styles.pendingBadge}>
                                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                            </View>
                        )}
                        <Ionicons name="chevron-forward" size={20} color={Colors.border} />
                    </View>
                </TouchableOpacity>

                {/* --- MY LISTINGS --- */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Experiences</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} />
                ) : (
                    <View style={{ paddingHorizontal: Spacing.lg }}>
                        {myListings.map((item) => (
                            <View key={item._id}>{renderExperienceCard({ item })}</View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/(host)/add-culture')}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    headerArea: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: 20 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcomeLabel: { color: 'white', opacity: 0.8, fontSize: 16 },
    hostName: { fontSize: 26, fontWeight: 'bold', color: 'white' },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginTop: -35,
        borderRadius: 15,
        padding: 20,
        elevation: 5,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statBorder: { borderLeftWidth: 1, borderLeftColor: '#eee' },
    statNumber: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
    statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
    sectionHeader: { paddingHorizontal: 20, marginTop: 25, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    requestNavBtn: {
        flexDirection: 'row',
        backgroundColor: 'white',
        marginHorizontal: 20,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 2,
    },
    requestNavInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    requestNavTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
    requestNavSubtitle: { fontSize: 12, color: '#888' },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pendingBadge: { backgroundColor: Colors.danger, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    pendingBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center' },
    img: { width: 60, height: 60, borderRadius: 8 },
    info: { flex: 1, marginLeft: 12 },
    categoryBadge: { fontSize: 10, color: Colors.primary, fontWeight: 'bold' },
    title: { fontWeight: 'bold', fontSize: 14 },
    price: { color: Colors.secondary, fontWeight: 'bold' },
    actions: { paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#eee' },
    actionBtn: { padding: 5 },
    fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});