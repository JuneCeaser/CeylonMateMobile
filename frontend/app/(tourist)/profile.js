import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import api from '../../constants/api';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const router = useRouter();
    const { user, userProfile, logout } = useAuth();

    // States for the Moments feature
    const [moments, setMoments] = useState([]);
    const [loadingMoments, setLoadingMoments] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    /**
     * Fetch preserved cultural moments from the backend
     */
    const fetchUserMoments = async () => {
        if (!user?.uid) return; 
        
        try {
            const res = await api.get(`/moments/user/${user.uid}`);
            if (res.data.success) {
                setMoments(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching moments:", error);
        } finally {
            setLoadingMoments(false);
            setRefreshing(false);
        }
    };

    /**
     * Delete a specific moment after user confirmation.
     */
    const handleDeleteMoment = (momentId) => {
        Alert.alert(
            "Delete Memory?",
            "This will permanently remove this AI-preserved moment from your timeline.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            const res = await api.delete(`/moments/${momentId}`);
                            if (res.data.success) {
                                fetchUserMoments(); 
                            }
                        } catch (error) {
                            Alert.alert("Error", "Could not delete moment.");
                        }
                    } 
                }
            ]
        );
    };

    useFocusEffect(
        useCallback(() => {
            setLoadingMoments(true);
            fetchUserMoments();
        }, [user?.uid])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchUserMoments();
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/auth/login');
                    },
                },
            ]
        );
    };

    const menuItems = [
        { icon: 'person-outline', label: 'Edit Profile', action: () => {} },
        { icon: 'heart-outline', label: 'Favorites', action: () => {} },
        { icon: 'time-outline', label: 'Travel History', action: () => {} },
        { icon: 'settings-outline', label: 'Settings', action: () => {} },
        { icon: 'help-circle-outline', label: 'Help & Support', action: () => {} },
    ];

    return (
        <View style={styles.container}>
            {/* Frozen Header with User Info */}
            <LinearGradient
                colors={[Colors.primary, Colors.accent]}
                style={styles.header}
            >
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: userProfile?.profilePicture || 'https://via.placeholder.com/100' }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editAvatarButton}>
                            <Ionicons name="camera" size={16} color={Colors.surface} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.userName}>{userProfile?.name || 'Traveler'}</Text>
                    <Text style={styles.userEmail}>{userProfile?.email}</Text>

                    {userProfile?.country && (
                        <View style={styles.locationBadge}>
                            <Ionicons name="location" size={14} color={Colors.surface} />
                            <Text style={styles.locationText}>{userProfile.country}</Text>
                        </View>
                    )}
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                }
            >
                {/* --- BEAUTIFIED CULTURAL TIMELINE SECTION --- */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <View>
                            <Text style={styles.sectionTitle}>Experience Timeline</Text>
                            <Text style={styles.sectionSubtitle}>{moments.length} Moments Preserved</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.addMomentBtn}
                            onPress={() => router.push('/(tourist)/add-moment')}
                        >
                            <LinearGradient
                                colors={['#2074ceff', '#156436ff']} // Updated to green gradient
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 0}}
                                style={styles.gradientAddBtn}
                            >
                                <Ionicons name="add" size={18} color="white" />
                                <Text style={styles.addMomentBtnText}>Moment</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {loadingMoments && !refreshing ? (
                        <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
                    ) : moments.length > 0 ? (
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalScroll}
                        >
                            {moments.map((moment) => (
                                <TouchableOpacity 
                                    key={moment._id} 
                                    style={styles.momentCardWide}
                                    onPress={() => router.push({
                                        pathname: '/(tourist)/moment-detail',
                                        params: { momentId: moment._id }
                                    })}
                                    onLongPress={() => handleDeleteMoment(moment._id)}
                                    activeOpacity={0.9}
                                >
                                    <Image source={{ uri: moment.imageUrl }} style={styles.gridImage} />
                                    
                                    <LinearGradient 
                                        colors={['transparent', 'rgba(0,0,0,0.9)']} 
                                        style={styles.imageOverlay}
                                    >
                                        <View style={styles.overlayContent}>
                                            <Text style={styles.overlayTitle} numberOfLines={1}>
                                                {moment.experienceName}
                                            </Text>
                                            <View style={styles.overlayLocRow}>
                                                <Ionicons name="location" size={12} color={Colors.accent} />
                                                <Text style={styles.overlayLocText} numberOfLines={1}>
                                                    {moment.location}
                                                </Text>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <TouchableOpacity 
                            style={styles.emptyMoments}
                            onPress={() => router.push('/(tourist)/add-moment')}
                        >
                            <MaterialCommunityIcons name="camera-plus-outline" size={42} color={Colors.primary} opacity={0.4} />
                            <Text style={styles.emptyMomentsText}>Tap here to preserve your first memory</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Travel Preferences Section */}
                {userProfile?.preferences && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Travel Preferences</Text>
                        <View style={styles.preferencesCard}>
                            <View style={styles.preferenceItem}>
                                <Text style={styles.preferenceLabel}>Budget Range</Text>
                                <Text style={styles.preferenceValue}>
                                    {userProfile.preferences.budgetRange?.toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.preferenceItem}>
                                <Text style={styles.preferenceLabel}>Interests</Text>
                                <View style={styles.interestTags}>
                                    {userProfile.preferences.activityInterests?.map((interest, index) => (
                                        <View key={index} style={styles.interestTag}>
                                            <Text style={styles.interestTagText}>{interest}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Settings & Information Menu */}
                <View style={styles.section}>
                    <View style={styles.menuCard}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.menuItem,
                                    index !== menuItems.length - 1 && styles.menuItemBorder,
                                ]}
                                onPress={item.action}
                            >
                                <View style={styles.menuItemLeft}>
                                    <Ionicons name={item.icon} size={22} color={Colors.primary} />
                                    <Text style={styles.menuItemText}>{item.label}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Authentication Action */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color={Colors.danger} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>CeylonMate v1.0.0</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
    },
    profileSection: {
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: Spacing.md,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: Colors.surface,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.accent,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: Spacing.xs,
    },
    userEmail: {
        fontSize: 14,
        color: Colors.surface,
        opacity: 0.9,
        marginBottom: Spacing.sm,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.lg,
        gap: 4,
    },
    locationText: {
        color: Colors.surface,
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
        marginBottom: 2,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    addMomentBtn: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        elevation: 2,
    },
    gradientAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        gap: 6,
    },
    addMomentBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    // --- Styles for the Enhanced Timeline ---
    horizontalScroll: {
        paddingRight: Spacing.lg,
        paddingVertical: 4,
        gap: 16,
    },
    momentCardWide: { 
        width: width * 0.7, 
        height: 180, 
        borderRadius: BorderRadius.lg, 
        overflow: 'hidden', 
        backgroundColor: Colors.border,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    gridImage: { 
        width: '100%', 
        height: '100%',
        resizeMode: 'cover'
    },
    imageOverlay: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: '80%', 
        justifyContent: 'flex-end', 
    },
    overlayContent: {
        padding: 12,
    },
    overlayTitle: { 
        color: 'white', 
        fontSize: 15, 
        fontWeight: 'bold',
        marginBottom: 4
    },
    overlayLocRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    overlayLocText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontWeight: '500'
    },
    emptyMoments: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        borderStyle: 'dashed',
    },
    emptyMomentsText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    // --- End Timeline Styles ---
    preferencesCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    preferenceItem: {
        marginBottom: Spacing.md,
    },
    preferenceLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    preferenceValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    interestTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    interestTag: {
        backgroundColor: Colors.primary + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    interestTagText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
    },
    menuCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    menuItemText: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.sm,
        marginTop: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.danger + '40',
    },
    logoutText: {
        fontSize: 16,
        color: Colors.danger,
        fontWeight: '600',
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: Spacing.lg,
    },
});