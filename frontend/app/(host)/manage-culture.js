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
    // Destructure userProfile to get the actual name saved in Firestore
    const { user, userProfile } = useAuth(); 
    const router = useRouter();
    
    const [myListings, setMyListings] = useState([]);
    const [loading, setLoading] = useState(true);

    /**
     * Fetch experiences created by the logged-in host
     */
    const fetchMyListings = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const response = await api.get('/experiences/my/list');
            setMyListings(response.data);
        } catch (_err) {
            console.error("Fetch error occurred");
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    /**
     * Re-fetch data every time the screen comes into focus
     */
    useFocusEffect(
        useCallback(() => {
            fetchMyListings();
        }, [fetchMyListings])
    );

    /**
     * Show a confirmation alert before deleting an experience
     */
    const confirmDelete = (id) => {
        Alert.alert("Delete Experience", "This will permanently remove this listing from the platform.", [
            { text: "Cancel", style: "cancel" }, 
            { text: "Delete", style: "destructive", onPress: () => handleDelete(id) }
        ]);
    };

    /**
     * Handle the API call to delete the experience
     */
    const handleDelete = async (id) => {
        try {
            await api.delete(`/experiences/delete/${id}`);
            // Update local state to remove the item immediately
            setMyListings(prev => prev.filter(item => item._id !== id));
            Alert.alert("Success", "Experience removed.");
        } catch (_err) {
            Alert.alert("Error", "Could not delete listing.");
        }
    };

    /**
     * Component to render each experience card in the list
     */
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
                {/* Edit Button */}
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => router.push({ pathname: '/(host)/add-culture', params: { editId: item._id } })}
                >
                    <Ionicons name="pencil" size={18} color={Colors.primary} />
                </TouchableOpacity>
                {/* Delete Button */}
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => confirmDelete(item._id)}
                >
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header Section with Gradient Background */}
            <LinearGradient colors={[Colors.primary, '#1B5E20']} style={styles.headerArea}>
                <View style={styles.headerTopRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.welcomeLabel}>Ayubowan! 🙏</Text>
                        <View style={{ height: Spacing.xs }} /> 
                        {/* Display actual host name from userProfile (Firestore) */}
                        <Text style={styles.hostName} numberOfLines={1}>
                            {userProfile?.name || "Our Local Host"}
                        </Text>
                    </View>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.notifBtn}>
                            <Ionicons name="notifications-outline" size={28} color={Colors.surface} />
                            <View style={styles.notifBadge} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/(host)/profile')}>
                            <Ionicons name="person-circle" size={48} color={Colors.surface} />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.headerSubtitle}>Your Heritage Dashboard 🇱🇰</Text>
            </LinearGradient>

            {/* Quick Stats Overlap (Showing 2 stats for better spacing) */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{myListings.length}</Text>
                    <Text style={styles.statLabel}>Active Experiences</Text>
                </View>
                <View style={[styles.statItem, styles.statBorder]}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="star" size={16} color={Colors.warning} />
                        <Text style={styles.statNumber}> 4.9</Text>
                    </View>
                    <Text style={styles.statLabel}>Host Rating</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                
                {/* Booking Requests Placeholder */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Booking Requests</Text>
                    <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
                </View>
                <View style={styles.placeholderCard}>
                    <Ionicons name="calendar-outline" size={24} color={Colors.textSecondary} />
                    <Text style={styles.placeholderText}>No pending bookings for today</Text>
                </View>

                {/* Experiences List Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Experiences</Text>
                    <Text style={styles.sectionCount}>{myListings.length} total</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <View style={{ paddingHorizontal: Spacing.lg }}>
                        {myListings.length > 0 ? (
                            myListings.map((item) => (
                                <View key={item._id}>{renderExperienceCard({ item })}</View>
                            ))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No experiences added yet.</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Reviews Placeholder */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Reviews</Text>
                </View>
                <View style={styles.placeholderCard}>
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.textSecondary} />
                    <Text style={styles.placeholderText}>No reviews received yet</Text>
                </View>

                {/* Support Button */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Support</Text>
                </View>
                <TouchableOpacity style={styles.supportBtn}>
                    <Ionicons name="help-buoy-outline" size={20} color={Colors.primary} />
                    <Text style={styles.supportBtnText}>Contact Support</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Floating Action Button (FAB) to Add New Experience */}
            <TouchableOpacity 
                style={styles.fabContainer} 
                activeOpacity={0.9}
                onPress={() => router.push('/(host)/add-culture')}
            >
                <LinearGradient colors={[Colors.primary, Colors.success]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.fabGradient}>
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.fabText}>Add Experience</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerArea: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: Spacing.lg },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    notifBtn: { position: 'relative' },
    notifBadge: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, backgroundColor: Colors.secondary, borderRadius: 5, borderWidth: 2, borderColor: Colors.primary },
    welcomeLabel: { color: Colors.surface, opacity: 0.85, fontSize: 16, fontWeight: '500' },
    hostName: { ...Typography.h1, color: Colors.surface, fontSize: 26 },
    headerSubtitle: { color: Colors.surface, opacity: 0.9, fontSize: 13, marginTop: 10 },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg,
        marginTop: -35,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        elevation: 6,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
    },
    statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statBorder: { borderLeftWidth: 1, borderLeftColor: Colors.border },
    statNumber: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
    statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textTransform: 'uppercase' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: 25, marginBottom: 12 },
    sectionTitle: { ...Typography.h3, fontSize: 18, color: Colors.text },
    sectionCount: { fontSize: 12, color: Colors.textSecondary },
    viewAll: { fontSize: 12, color: Colors.primary, fontWeight: 'bold' },
    card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 12, marginBottom: 12, alignItems: 'center', elevation: 2 },
    img: { width: 60, height: 60, borderRadius: BorderRadius.md, backgroundColor: '#eee' },
    info: { flex: 1, marginLeft: 12 },
    categoryBadge: { fontSize: 9, fontWeight: 'bold', color: Colors.primary, textTransform: 'uppercase' },
    title: { fontWeight: 'bold', fontSize: 14, color: Colors.text },
    price: { color: Colors.secondary, fontWeight: 'bold', fontSize: 13 },
    actions: { flexDirection: 'row', gap: 10, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: Colors.border },
    actionBtn: { padding: 5 },
    placeholderCard: { marginHorizontal: Spacing.lg, padding: 20, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 10 },
    placeholderText: { fontSize: 13, color: Colors.textSecondary },
    supportBtn: { marginHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, backgroundColor: Colors.primary + '10', borderRadius: BorderRadius.md, gap: 10, marginBottom: 20 },
    supportBtnText: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },
    fabContainer: { position: 'absolute', bottom: 30, alignSelf: 'center', elevation: 8, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 10 },
    fabGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 15, borderRadius: BorderRadius.round, gap: 8 },
    fabText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    emptyContainer: { padding: 20, alignItems: 'center' },
    emptyText: { color: Colors.textSecondary, fontSize: 13 }
});