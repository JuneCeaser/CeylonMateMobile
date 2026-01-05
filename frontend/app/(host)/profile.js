import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Image, 
    Alert, 
    ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function ProfileScreen() {
    const { user, userProfile, logout } = useAuth();
    const router = useRouter();

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
                        // 1. Clear the session in AuthContext
                        await logout();

                        /** * 2. Navigate to Login page
                         * Since your file is at app/auth/login.js, 
                         * the route is exactly '/auth/login'
                         */
                        router.replace('/auth/login'); 

                    } catch (error) {
                        console.error("Logout Error:", error);
                        Alert.alert("Error", "Logout failed. Please try again.");
                    }
                } 
            }
        ]
    );
};

    return (
        <ScrollView style={styles.container}>
            {/* Header with Background */}
            <LinearGradient colors={[Colors.primary, '#1B5E20']} style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.profileInfo}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={50} color={Colors.primary} />
                    </View>
                    <Text style={styles.name}>{userProfile?.name || "Local Host"}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>VERIFIED HOST 🇱🇰</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Account Settings</Text>
                
                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconBox}>
                        <Ionicons name="person-outline" size={22} color={Colors.primary} />
                    </View>
                    <Text style={styles.menuText}>Edit Profile</Text>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconBox}>
                        <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
                    </View>
                    <Text style={styles.menuText}>Notifications</Text>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconBox}>
                        <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
                    </View>
                    <Text style={styles.menuText}>Privacy & Security</Text>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* LOGOUT BUTTON */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <View style={[styles.menuIconBox, { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
                    </View>
                    <Text style={[styles.menuText, { color: Colors.danger }]}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.versionText}>Ceylon Mate v1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingTop: 60, paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    backBtn: { position: 'absolute', top: 50, left: 20 },
    profileInfo: { alignItems: 'center' },
    avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5 },
    name: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    email: { fontSize: 14, color: 'white', opacity: 0.8, marginTop: 4 },
    badge: { backgroundColor: Colors.secondary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 12 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    content: { padding: 25 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 20, opacity: 0.6 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 2 },
    menuIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0F7F0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuText: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 15, elevation: 2 },
    versionText: { textAlign: 'center', color: '#AAA', fontSize: 12, marginBottom: 30 }
});