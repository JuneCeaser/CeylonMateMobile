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
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors } from '../../constants/theme';

export default function ManageCultureScreen() {
    // Access authenticated user data and logout function from AuthContext
    const { user, logout } = useAuth(); 
    const router = useRouter();
    
    // State to store the list of experiences created by the host
    const [myListings, setMyListings] = useState([]);
    const [loading, setLoading] = useState(true);

    /**
     * fetchMyListings: Retrieves all cultural experiences belonging 
     * to the currently logged-in host from the MongoDB backend.
     */
    const fetchMyListings = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            // Updated endpoint to match your backend route structure
            const response = await api.get('/experiences/my/list');
            setMyListings(response.data);
        } catch (_err) {
            console.error("Fetch error occurred: Check backend connection or IP address");
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    /**
     * useFocusEffect: Refreshes the list every time the user 
     * navigates back to this screen.
     */
    useFocusEffect(
        useCallback(() => {
            fetchMyListings();
        }, [fetchMyListings])
    );

    /**
     * handleLogout: Signs the user out of Firebase and 
     * clears local session storage.
     */
    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Logout", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await logout();
                            // Redirect to login screen after successful sign-out
                            router.replace('/auth/login');
                        } catch (error) {
                            Alert.alert("Error", "Logout failed. Please try again.");
                        }
                    } 
                }
            ]
        );
    };

    /**
     * confirmDelete: Triggers a confirmation dialog before 
     * deleting an experience listing.
     */
    const confirmDelete = (id) => {
        Alert.alert(
            "Delete Tradition", 
            "Are you sure you want to permanently delete this experience?", 
            [
                { text: "Cancel", style: "cancel" }, 
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: () => handleDelete(id) 
                }
            ]
        );
    };

    /**
     * handleDelete: Calls the backend API to remove an experience 
     * from the MongoDB database.
     */
    const handleDelete = async (id) => {
        try {
            // Updated endpoint to match your backend delete route
            await api.delete(`/experiences/delete/${id}`);
            setMyListings(prev => prev.filter(item => item._id !== id));
            Alert.alert("Success", "Experience deleted successfully");
        } catch (_err) {
            Alert.alert("Error", "Could not delete listing. Please try again.");
        }
    };

    // UI Component for each individual experience card
    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <Image 
                source={{ uri: item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/150' }} 
                style={styles.img} 
            />
            
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.price}>LKR {item.price}</Text>
            </View>

            <View style={styles.actions}>
                {/* Navigation to Edit Screen */}
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => router.push({ pathname: '/(host)/add-culture', params: { editId: item._id } })}
                >
                    <Ionicons name="create-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => confirmDelete(item._id)}
                >
                    <Ionicons name="trash-outline" size={22} color="#FF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header Section with Refresh and Logout Actions */}
            <View style={styles.headerRow}>
                <Text style={styles.header}>My Dashboard</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={fetchMyListings} style={styles.headerIcon}>
                        <Ionicons name="refresh" size={24} color="#333" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={handleLogout} style={styles.headerIcon}>
                        <Ionicons name="log-out-outline" size={24} color="#FF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Display loading indicator or the list of items */}
            {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 50}} />
            ) : (
                <FlatList 
                    data={myListings}
                    keyExtractor={(item) => item._id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>You have not listed any experiences yet.</Text>
                            <Text style={styles.emptySubText}>Tap the + button to start sharing your culture!</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Action Button (FAB) to navigate to Add Experience screen */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => router.push('/(host)/add-culture')}
            >
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20, paddingTop: 50 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginLeft: 15 },
    card: { 
        flexDirection: 'row', 
        backgroundColor: '#FFF', 
        borderRadius: 16, 
        padding: 12, 
        marginBottom: 15, 
        alignItems: 'center', 
        elevation: 3
    },
    img: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#eee' },
    info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
    title: { fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 4 },
    category: { fontSize: 12, color: '#888', textTransform: 'uppercase', fontWeight: 'bold' },
    price: { color: '#4CAF50', fontWeight: 'bold', marginTop: 4 },
    actions: { 
        flexDirection: 'column', 
        gap: 12, 
        paddingLeft: 10,
        borderLeftWidth: 1,
        borderLeftColor: '#F0F0F0',
        marginLeft: 5
    },
    actionBtn: { padding: 4 },
    fab: { 
        position: 'absolute', 
        bottom: 30, 
        right: 30, 
        backgroundColor: '#4CAF50', 
        width: 65, 
        height: 65, 
        borderRadius: 35, 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 8
    },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#555', marginBottom: 10 },
    emptySubText: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: 40 }
});