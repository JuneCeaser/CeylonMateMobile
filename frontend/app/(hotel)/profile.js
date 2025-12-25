import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function HotelProfileScreen() {
    const router = useRouter();
    const { userProfile, logout } = useAuth();

    const [showEditModal, setShowEditModal] = useState(false);
    const [editField, setEditField] = useState(null);

    // Edit form state
    const [hotelName, setHotelName] = useState(userProfile?.hotelName || '');
    const [hotelAddress, setHotelAddress] = useState(userProfile?.hotelAddress || '');
    const [hotelCity, setHotelCity] = useState(userProfile?.hotelCity || '');
    const [phone, setPhone] = useState(userProfile?.phone || '');
    const [description, setDescription] = useState(userProfile?.description || '');
    const [profileImage, setProfileImage] = useState(
        userProfile?.profileImage || 'https://via.placeholder.com/100'
    );

    const hotelStats = {
        totalBookings: 156,
        activeListings: 8,
        averageRating: 4.6,
        totalReviews: 89,
        joinedDate: 'January 2024',
    };

    const menuItems = [
        { icon: 'create-outline', label: 'Edit Hotel Info', action: () => openEditModal('info') },
        { icon: 'image-outline', label: 'Hotel Photos', action: () => {} },
        { icon: 'notifications-outline', label: 'Notifications', action: () => {} },
        { icon: 'card-outline', label: 'Payment Methods', action: () => {} },
        { icon: 'document-text-outline', label: 'Terms & Policies', action: () => {} },
        { icon: 'help-circle-outline', label: 'Help & Support', action: () => {} },
    ];

    const openEditModal = (field) => {
        setEditField(field);
        setShowEditModal(true);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
            // TODO: Upload to Firebase Storage
        }
    };

    const handleSaveProfile = async () => {
        try {
            const userId = userProfile?.uid || 'temp';
            await updateDoc(doc(db, 'users', userId), {
                hotelName,
                hotelAddress,
                hotelCity,
                phone,
                description,
                profileImage,
            });

            Alert.alert('Success', 'Profile updated successfully!');
            setShowEditModal(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        }
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

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[Colors.secondary, Colors.warning]}
                style={styles.header}
            >
                <View style={styles.profileSection}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                        <Image
                            source={{ uri: profileImage }}
                            style={styles.avatar}
                        />
                        <View style={styles.editAvatarButton}>
                            <Ionicons name="camera" size={16} color={Colors.surface} />
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.hotelName}>{hotelName}</Text>
                    <View style={styles.locationBadge}>
                        <Ionicons name="location" size={14} color={Colors.surface} />
                        <Text style={styles.locationText}>{hotelCity}</Text>
                    </View>

                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color={Colors.warning} />
                        <Text style={styles.ratingText}>{hotelStats.averageRating}</Text>
                        <Text style={styles.reviewsText}>({hotelStats.totalReviews} reviews)</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Cards */}
                <View style={styles.statsSection}>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Ionicons name="calendar" size={28} color={Colors.primary} />
                            <Text style={styles.statNumber}>{hotelStats.totalBookings}</Text>
                            <Text style={styles.statLabel}>Total Bookings</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="bed" size={28} color={Colors.secondary} />
                            <Text style={styles.statNumber}>{hotelStats.activeListings}</Text>
                            <Text style={styles.statLabel}>Active Rooms</Text>
                        </View>
                    </View>
                </View>

                {/* Hotel Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hotel Information</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Ionicons name="business" size={20} color={Colors.secondary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Hotel Name</Text>
                                <Text style={styles.infoValue}>{hotelName}</Text>
                            </View>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <Ionicons name="location" size={20} color={Colors.secondary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Address</Text>
                                <Text style={styles.infoValue}>{hotelAddress}</Text>
                            </View>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <Ionicons name="call" size={20} color={Colors.secondary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Phone</Text>
                                <Text style={styles.infoValue}>{phone}</Text>
                            </View>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <Ionicons name="mail" size={20} color={Colors.secondary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{userProfile?.email}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <View style={styles.descriptionCard}>
                            <Text style={styles.descriptionText}>{description}</Text>
                        </View>
                    </View>
                )}

                {/* Menu Items */}
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
                                    <Ionicons name={item.icon} size={24} color={Colors.secondary} />
                                    <Text style={styles.menuItemText}>{item.label}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color={Colors.danger} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.versionText}>CeylonMate for Hotels v1.0.0</Text>
                <Text style={styles.joinedText}>Member since {hotelStats.joinedDate}</Text>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowEditModal(false)}>
                            <Ionicons name="close" size={28} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Hotel Information</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <ScrollView
                        style={styles.modalContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Hotel Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter hotel name"
                                value={hotelName}
                                onChangeText={setHotelName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Address</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Enter hotel address"
                                value={hotelAddress}
                                onChangeText={setHotelAddress}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>City</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter city"
                                value={hotelCity}
                                onChangeText={setHotelCity}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter phone number"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your hotel..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={5}
                            />
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
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
    hotelName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: Spacing.xs,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.lg,
        gap: 4,
        marginBottom: Spacing.sm,
    },
    locationText: {
        color: Colors.surface,
        fontSize: 12,
        fontWeight: '600',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.surface,
    },
    reviewsText: {
        fontSize: 14,
        color: Colors.surface,
        opacity: 0.9,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Spacing.xl * 2,
    },
    statsSection: {
        padding: Spacing.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: Spacing.xs,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
    section: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    infoCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    infoDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.sm,
    },
    descriptionCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    descriptionText: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 22,
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
        paddingHorizontal: Spacing.lg,
    },
    joinedText: {
        textAlign: 'center',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
        paddingHorizontal: Spacing.lg,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    modalContent: {
        flex: 1,
        padding: Spacing.lg,
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: Colors.success,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.xl,
    },
    saveButtonText: {
        color: Colors.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
});