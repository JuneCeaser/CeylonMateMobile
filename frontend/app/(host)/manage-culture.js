import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    Alert, 
    ActivityIndicator 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function ManageCultureScreen() {
    const { user, logout } = useAuth(); 
    const router = useRouter();
    
    const [myListings, setMyListings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMyListings = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const response = await api.get('/experiences/my/list');
            setMyListings(response.data);
        } catch (_err) {
            console.error("Fetch error occurred: Check backend connection");
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useFocusEffect(
        useCallback(() => {
            fetchMyListings();
        }, [fetchMyListings])
    );

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Logout", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await logout();
                        router.replace('/auth/login');
                    } catch (error) {
                        Alert.alert("Error", "Logout failed.");
                    }
                } 
            }
        ]);
    };

    const confirmDelete = (id) => {
        Alert.alert("Delete Tradition", "This will permanently remove this listing.", [
            { text: "Cancel", style: "cancel" }, 
            { text: "Delete", style: "destructive", onPress: () => handleDelete(id) }
        ]);
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/experiences/delete/${id}`);
            setMyListings(prev => prev.filter(item => item._id !== id));
            Alert.alert("Success", "Experience deleted successfully");
        } catch (_err) {
            Alert.alert("Error", "Could not delete listing.");
        }
    };

    const renderItem = ({ item }) => (
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
                    <Ionicons name="pencil" size={20} color={Colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => confirmDelete(item._id)}
                >
                    <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* 1. Header with Branding & Identity */}
            <LinearGradient
                colors={[Colors.primary, '#1B5E20']}
                style={styles.headerArea}
            >
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.welcomeText}>Ayubowan, Host! 🙏</Text>
                        <Text style={styles.headerTitle}>Host Dashboard</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={fetchMyListings} style={styles.headerIcon}>
                            <Ionicons name="refresh" size={24} color={Colors.surface} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} style={styles.headerIcon}>
                            <Ionicons name="log-out-outline" size={24} color="#FFCDD2" />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.headerSubtitle}>Manage your Sri Lankan traditions 🇱🇰</Text>
            </LinearGradient>

            {/* 2. Quick Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{myListings.length}</Text>
                    <Text style={styles.statLabel}>Active Listings</Text>
                </View>
                <View style={[styles.statItem, styles.statBorder]}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="star" size={16} color={Colors.warning} />
                        <Text style={styles.statNumber}> 5.0</Text>
                    </View>
                    <Text style={styles.statLabel}>Avg Rating</Text>
                </View>
                <View style={[styles.statItem, styles.statBorder]}>
                    <Text style={styles.statNumber}>0</Text>
                    <Text style={styles.statLabel}>Bookings</Text>
                </View>
            </View>

            {/* 3. Experience Management List */}
            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList 
                    data={myListings}
                    keyExtractor={(item) => item._id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="leaf-outline" size={60} color={Colors.border} />
                            <Text style={styles.emptyText}>You have not listed any experiences yet.</Text>
                            <TouchableOpacity 
                                style={styles.emptyButton}
                                onPress={() => router.push('/(host)/add-culture')}
                            >
                                <Text style={styles.emptyButtonText}>Publish Your First Tradition</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* 4. FAB to Add New Experience */}
            <TouchableOpacity 
                style={styles.fab} 
                activeOpacity={0.8}
                onPress={() => router.push('/(host)/add-culture')}
            >
                <LinearGradient
                    colors={[Colors.primary, Colors.success]}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color="white" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerArea: {
        paddingTop: 60,
        paddingBottom: 40, // Increased to make room for stats overlap
        paddingHorizontal: Spacing.lg,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeText: { color: Colors.surface, opacity: 0.8, fontSize: 14 },
    headerTitle: { ...Typography.h1, color: Colors.surface, fontSize: 26 },
    headerSubtitle: { color: Colors.surface, opacity: 0.9, fontSize: 13, marginTop: 4 },
    headerActions: { flexDirection: 'row', gap: 15 },
    headerIcon: { padding: 5 },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg,
        marginTop: -25, // Overlap effect
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statBorder: { borderLeftWidth: 1, borderLeftColor: Colors.border },
    statNumber: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
    statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
    listContainer: { padding: Spacing.lg, paddingBottom: 120 },
    card: { 
        flexDirection: 'row', 
        backgroundColor: Colors.surface, 
        borderRadius: BorderRadius.lg, 
        padding: 12, 
        marginBottom: 15, 
        alignItems: 'center', 
        elevation: 2,
    },
    img: { width: 75, height: 75, borderRadius: BorderRadius.md, backgroundColor: '#eee' },
    info: { flex: 1, marginLeft: 15 },
    categoryBadge: { fontSize: 10, fontWeight: 'bold', color: Colors.primary, textTransform: 'uppercase' },
    title: { fontWeight: 'bold', fontSize: 16, color: Colors.text, marginVertical: 2 },
    price: { color: Colors.secondary, fontWeight: 'bold', fontSize: 14 },
    actions: { 
        flexDirection: 'row', 
        gap: 8,
        paddingLeft: 10,
        borderLeftWidth: 1,
        borderLeftColor: Colors.border,
    },
    actionBtn: { 
        padding: 8, 
        backgroundColor: Colors.background, 
        borderRadius: BorderRadius.sm 
    },
    fab: { 
        position: 'absolute', 
        bottom: 30, 
        right: 30, 
        elevation: 8,
    },
    fabGradient: {
        width: 65, 
        height: 65, 
        borderRadius: 33, 
        justifyContent: 'center', 
        alignItems: 'center',
    },
    loader: { flex: 1, justifyContent: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 15, color: Colors.textSecondary, marginTop: 15, textAlign: 'center' },
    emptyButton: { marginTop: 15, backgroundColor: Colors.primary + '15', padding: 12, borderRadius: BorderRadius.md },
    emptyButtonText: { color: Colors.primary, fontWeight: 'bold' }
});