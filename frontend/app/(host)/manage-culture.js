import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Image, 
    Alert, 
    ActivityIndicator,
    ScrollView,
    Dimensions 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

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

    const handleDelete = (id) => {
        Alert.alert(
            "Delete Experience",
            "Are you sure you want to remove this listing permanently?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await api.delete(`/experiences/${id}`);
                            fetchMyListings(); 
                            Alert.alert("Success", "Experience deleted successfully");
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete experience");
                        }
                    } 
                }
            ]
        );
    };

    const calculateEarnings = () => {
        return bookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
    };

    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;

    const renderExperienceCard = (item) => (
        <View style={styles.card} key={item._id}>
            <Image 
                source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }} 
                style={styles.img} 
            />
            <View style={styles.info}>
                <Text style={styles.categoryBadge}>{item.category}</Text>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.price}>LKR {item.price.toLocaleString()}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity 
                    style={[styles.actionBtn, styles.editBtnBg]} 
                    onPress={() => router.push({ pathname: '/(host)/add-culture', params: { editId: item._id } })}
                >
                    <Ionicons name="create" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionBtn, styles.deleteBtnBg]} 
                    onPress={() => handleDelete(item._id)}
                >
                    <Ionicons name="trash" size={20} color="#D32F2F" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header Section */}
                <LinearGradient colors={[Colors.primary, '#1B5E20']} style={styles.headerArea}>
                    <View style={styles.headerTopRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.welcomeLabel}>Ayubowan! 🙏</Text>
                            <Text style={styles.hostName}>{userProfile?.name || "Host"}</Text>
                            <Text style={styles.headerSubtitle}>Your Smart Host Hub</Text>
                        </View>
                        <View style={styles.headerIcons}>
                            <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/(host)/notifications')}>
                                <Ionicons name="notifications" size={26} color="white" />
                                {pendingCount > 0 && <View style={styles.notifBadge} />}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/(host)/profile')}>
                                <Ionicons name="person-circle" size={44} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>

                {/* Stat Cards Section */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{myListings.length}</Text>
                        <Text style={styles.statLabel}>Listings</Text>
                    </View>
                    <View style={[styles.statItem, styles.statBorder]}>
                        <Text style={[styles.statNumber, { color: Colors.secondary }]}>
                            {calculateEarnings() >= 1000 ? (calculateEarnings()/1000).toFixed(1) + 'k' : calculateEarnings()}
                        </Text>
                        <Text style={styles.statLabel}>Earnings</Text>
                    </View>
                    <View style={[styles.statItem, styles.statBorder]}>
                        <Text style={[styles.statNumber, { color: '#FFA000' }]}>{confirmedCount}</Text>
                        <Text style={styles.statLabel}>Confirmed</Text>
                    </View>
                </View>

                {/* Manage Requests Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Manage Requests</Text>
                </View>
                <TouchableOpacity 
                    style={styles.requestNavBtn}
                    onPress={() => router.push('/(host)/booking-request')}
                    activeOpacity={0.8}
                >
                    <View style={styles.requestNavInfo}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="mail-unread" size={24} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.requestNavTitle}>Booking Requests</Text>
                            <Text style={styles.requestNavSubtitle}>{pendingCount} new inquiries to handle</Text>
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

                {/* My Experiences Section Header with Inline Add Button */}
                <View style={styles.sectionHeaderRow}>
                    <View>
                        <Text style={styles.sectionTitle}>My Experiences</Text>
                        <Text style={styles.sectionSubtitle}>{myListings.length} items listed</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.inlineAddBtn}
                        onPress={() => router.push('/(host)/add-culture')}
                    >
                        <Ionicons name="add" size={20} color="white" />
                        <Text style={styles.inlineAddBtnText}>Add New</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <View style={{ paddingHorizontal: 20 }}>
                        {myListings.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="file-tray-outline" size={50} color="#CCC" />
                                <Text style={styles.emptyText}>You have not added any experiences yet.</Text>
                                <TouchableOpacity 
                                    style={styles.emptyAddBtn}
                                    onPress={() => router.push('/(host)/add-culture')}
                                >
                                    <Text style={styles.emptyAddBtnText}>Create Your First Experience</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            myListings.map((item) => renderExperienceCard(item))
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    headerArea: { paddingTop: 60, paddingBottom: 85, paddingHorizontal: 25 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    notifBtn: { position: 'relative' },
    notifBadge: { 
        position: 'absolute', top: 2, right: 2, width: 8, height: 8, 
        borderRadius: 4, backgroundColor: '#FF5252', borderWidth: 1.5, borderColor: Colors.primary 
    },
    welcomeLabel: { color: 'white', opacity: 0.8, fontSize: 14, fontWeight: '500' },
    hostName: { fontSize: 26, fontWeight: 'bold', color: 'white' },
    headerSubtitle: { color: 'white', opacity: 0.85, fontSize: 13, fontWeight: 'bold', marginTop: 8, lineHeight: 18 },
    
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginTop: -45,
        borderRadius: 18,
        paddingVertical: 22,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statBorder: { borderLeftWidth: 1, borderLeftColor: '#F0F0F0' },
    statNumber: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
    statLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },

    sectionHeader: { paddingHorizontal: 25, marginTop: 35, marginBottom: 15 },
    sectionHeaderRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 25, 
        marginTop: 35, 
        marginBottom: 15 
    },
    sectionTitle: { fontSize: 19, fontWeight: '800', color: '#333' },
    sectionSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },

    requestNavBtn: {
        flexDirection: 'row', 
        backgroundColor: 'white', 
        marginHorizontal: 20,
        padding: 18, 
        borderRadius: 20, 
        alignItems: 'center', 
        justifyContent: 'space-between',
        elevation: 8, 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12, 
        shadowRadius: 12, 
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)', 
    },
    requestNavInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    requestNavTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
    requestNavSubtitle: { fontSize: 12, color: '#888' },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pendingBadge: { backgroundColor: '#D32F2F', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    pendingBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    card: {
        flexDirection: 'row', backgroundColor: 'white', borderRadius: 18, padding: 15,
        marginBottom: 15, alignItems: 'center', elevation: 3, shadowColor: Colors.primary,
        shadowOpacity: 0.05, shadowRadius: 8
    },
    img: { width: 75, height: 75, borderRadius: 12 },
    info: { flex: 1, marginLeft: 15 },
    categoryBadge: { fontSize: 10, color: Colors.primary, fontWeight: 'bold', textTransform: 'uppercase' },
    title: { fontWeight: '700', fontSize: 15, color: '#333', marginTop: 2 },
    price: { color: Colors.secondary, fontWeight: 'bold', marginTop: 5 },

    actions: { paddingLeft: 15, borderLeftWidth: 1, borderLeftColor: '#F0F0F0', gap: 10 },
    actionBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    editBtnBg: { backgroundColor: Colors.primary + '15' },
    deleteBtnBg: { backgroundColor: '#D32F2F15' },

    inlineAddBtn: { 
        flexDirection: 'row', 
        backgroundColor: Colors.primary, 
        paddingHorizontal: 15, 
        paddingVertical: 8, 
        borderRadius: 12, 
        alignItems: 'center',
        elevation: 3
    },
    inlineAddBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 4, fontSize: 13 },

    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 10, fontSize: 14, fontStyle: 'italic' },
    emptyAddBtn: { marginTop: 15, backgroundColor: Colors.primary + '15', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    emptyAddBtnText: { color: Colors.primary, fontWeight: 'bold' }
});