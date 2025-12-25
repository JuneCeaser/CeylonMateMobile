import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function ProfileScreen() {
    const router = useRouter();
    const { userProfile, logout } = useAuth();

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
        { icon: 'settings-outline', label: 'Settings', action: () => {} },
        { icon: 'heart-outline', label: 'Favorites', action: () => {} },
        { icon: 'time-outline', label: 'Travel History', action: () => {} },
        { icon: 'help-circle-outline', label: 'Help & Support', action: () => {} },
        { icon: 'information-circle-outline', label: 'About', action: () => {} },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
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
            >
                {/* Preferences */}
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

                {/* Menu */}
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
                                    <Ionicons name={item.icon} size={24} color={Colors.primary} />
                                    <Text style={styles.menuItemText}>{item.label}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Logout Button */}
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
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
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