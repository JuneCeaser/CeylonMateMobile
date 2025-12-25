import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Modal,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function ListingsScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const [listings, setListings] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingListing, setEditingListing] = useState(null);

    // Form state
    const [roomType, setRoomType] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [maxGuests, setMaxGuests] = useState('2');
    const [selectedAmenities, setSelectedAmenities] = useState([]);
    const [images, setImages] = useState([]);

    const amenitiesList = [
        { id: 'wifi', label: 'WiFi', icon: 'wifi' },
        { id: 'ac', label: 'Air Conditioning', icon: 'snow' },
        { id: 'tv', label: 'TV', icon: 'tv' },
        { id: 'minibar', label: 'Mini Bar', icon: 'beer' },
        { id: 'breakfast', label: 'Breakfast', icon: 'restaurant' },
        { id: 'parking', label: 'Parking', icon: 'car' },
        { id: 'pool', label: 'Pool Access', icon: 'water' },
        { id: 'gym', label: 'Gym', icon: 'fitness' },
        { id: 'spa', label: 'Spa', icon: 'sparkles' },
        { id: 'balcony', label: 'Balcony', icon: 'home' },
    ];

    useEffect(() => {
        loadListings();
    }, []);

    const loadListings = async () => {
        try {
            // Mock data for now
            setListings([
                {
                    id: '1',
                    roomType: 'Deluxe Room',
                    description: 'Spacious room with ocean view',
                    price: 12000,
                    maxGuests: 2,
                    amenities: ['wifi', 'ac', 'tv', 'breakfast', 'balcony'],
                    images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400'],
                    status: 'active',
                    bookings: 45,
                },
                {
                    id: '2',
                    roomType: 'Standard Room',
                    description: 'Comfortable room with city view',
                    price: 8000,
                    maxGuests: 2,
                    amenities: ['wifi', 'ac', 'tv'],
                    images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400'],
                    status: 'active',
                    bookings: 32,
                },
            ]);
        } catch (error) {
            console.error('Error loading listings:', error);
        }
    };

    const toggleAmenity = (amenityId) => {
        if (selectedAmenities.includes(amenityId)) {
            setSelectedAmenities(selectedAmenities.filter(a => a !== amenityId));
        } else {
            setSelectedAmenities([...selectedAmenities, amenityId]);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImages([...images, ...result.assets.map(asset => asset.uri)]);
        }
    };

    const handleSaveListing = async () => {
        if (!roomType || !price || !maxGuests) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            const listingData = {
                hotelId: user?.uid,
                roomType,
                description,
                price: parseFloat(price),
                maxGuests: parseInt(maxGuests),
                amenities: selectedAmenities,
                images,
                status: 'active',
                createdAt: new Date().toISOString(),
            };

            if (editingListing) {
                // Update existing listing
                await updateDoc(doc(db, 'hotelListings', editingListing.id), listingData);
                Alert.alert('Success', 'Listing updated successfully!');
            } else {
                // Create new listing
                await addDoc(collection(db, 'hotelListings'), listingData);
                Alert.alert('Success', 'Listing created successfully!');
            }

            // Reset form
            resetForm();
            setShowAddModal(false);
            loadListings();
        } catch (error) {
            console.error('Error saving listing:', error);
            Alert.alert('Error', 'Failed to save listing');
        }
    };

    const resetForm = () => {
        setRoomType('');
        setDescription('');
        setPrice('');
        setMaxGuests('2');
        setSelectedAmenities([]);
        setImages([]);
        setEditingListing(null);
    };

    const handleEditListing = (listing) => {
        setEditingListing(listing);
        setRoomType(listing.roomType);
        setDescription(listing.description);
        setPrice(listing.price.toString());
        setMaxGuests(listing.maxGuests.toString());
        setSelectedAmenities(listing.amenities);
        setImages(listing.images);
        setShowAddModal(true);
    };

    const handleDeleteListing = (listingId) => {
        Alert.alert(
            'Delete Listing',
            'Are you sure you want to delete this listing?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'hotelListings', listingId));
                            Alert.alert('Success', 'Listing deleted successfully');
                            loadListings();
                        } catch (error) {
                            console.error('Error deleting listing:', error);
                            Alert.alert('Error', 'Failed to delete listing');
                        }
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
                <Text style={styles.headerTitle}>My Listings</Text>
                <Text style={styles.headerSubtitle}>Manage your room listings</Text>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Add New Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        resetForm();
                        setShowAddModal(true);
                    }}
                >
                    <LinearGradient
                        colors={[Colors.primary, Colors.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.addButtonGradient}
                    >
                        <Ionicons name="add-circle" size={24} color={Colors.surface} />
                        <Text style={styles.addButtonText}>Add New Listing</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Listings Grid */}
                <View style={styles.listingsGrid}>
                    {listings.map((listing) => (
                        <View key={listing.id} style={styles.listingCard}>
                            <Image
                                source={{ uri: listing.images[0] }}
                                style={styles.listingImage}
                            />

                            <View style={styles.listingBadge}>
                                <Text style={styles.listingBadgeText}>
                                    {listing.status.toUpperCase()}
                                </Text>
                            </View>

                            <View style={styles.listingContent}>
                                <Text style={styles.listingRoomType}>{listing.roomType}</Text>
                                <Text style={styles.listingDescription} numberOfLines={2}>
                                    {listing.description}
                                </Text>

                                <View style={styles.listingPrice}>
                                    <Text style={styles.priceAmount}>LKR {listing.price.toLocaleString()}</Text>
                                    <Text style={styles.priceUnit}>/ night</Text>
                                </View>

                                <View style={styles.listingDetails}>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                                        <Text style={styles.detailText}>{listing.maxGuests} guests</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                                        <Text style={styles.detailText}>{listing.bookings} bookings</Text>
                                    </View>
                                </View>

                                {/* Amenities */}
                                <View style={styles.amenitiesPreview}>
                                    {listing.amenities.slice(0, 4).map((amenityId) => {
                                        const amenity = amenitiesList.find(a => a.id === amenityId);
                                        return (
                                            <View key={amenityId} style={styles.amenityIcon}>
                                                <Ionicons
                                                    name={amenity?.icon}
                                                    size={16}
                                                    color={Colors.primary}
                                                />
                                            </View>
                                        );
                                    })}
                                    {listing.amenities.length > 4 && (
                                        <Text style={styles.amenitiesMore}>
                                            +{listing.amenities.length - 4}
                                        </Text>
                                    )}
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.listingActions}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.editButton]}
                                        onPress={() => handleEditListing(listing)}
                                    >
                                        <Ionicons name="create-outline" size={18} color={Colors.primary} />
                                        <Text style={styles.editButtonText}>Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.deleteButton]}
                                        onPress={() => handleDeleteListing(listing.id)}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {listings.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="bed-outline" size={64} color={Colors.textSecondary} />
                        <Text style={styles.emptyStateText}>No listings yet</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Create your first listing to start receiving bookings
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Add/Edit Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowAddModal(false)}>
                            <Ionicons name="close" size={28} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {editingListing ? 'Edit Listing' : 'Add New Listing'}
                        </Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <ScrollView
                        style={styles.modalContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Room Type */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Room Type *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Deluxe Room, Suite, Standard Room"
                                value={roomType}
                                onChangeText={setRoomType}
                            />
                        </View>

                        {/* Description */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your room..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        {/* Price */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Price per Night (LKR) *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., 12000"
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Max Guests */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Maximum Guests *</Text>
                            <View style={styles.stepperContainer}>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setMaxGuests(Math.max(1, parseInt(maxGuests) - 1).toString())}
                                >
                                    <Ionicons name="remove" size={24} color={Colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{maxGuests}</Text>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => setMaxGuests((parseInt(maxGuests) + 1).toString())}
                                >
                                    <Ionicons name="add" size={24} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Amenities */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Amenities</Text>
                            <View style={styles.amenitiesGrid}>
                                {amenitiesList.map((amenity) => (
                                    <TouchableOpacity
                                        key={amenity.id}
                                        style={[
                                            styles.amenityChip,
                                            selectedAmenities.includes(amenity.id) && styles.amenityChipActive,
                                        ]}
                                        onPress={() => toggleAmenity(amenity.id)}
                                    >
                                        <Ionicons
                                            name={amenity.icon}
                                            size={20}
                                            color={
                                                selectedAmenities.includes(amenity.id)
                                                    ? Colors.surface
                                                    : Colors.primary
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.amenityChipText,
                                                selectedAmenities.includes(amenity.id) && styles.amenityChipTextActive,
                                            ]}
                                        >
                                            {amenity.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Images */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Photos</Text>
                            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                                <Ionicons name="camera" size={24} color={Colors.primary} />
                                <Text style={styles.imagePickerText}>Add Photos</Text>
                            </TouchableOpacity>

                            {images.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.imagesPreview}
                                >
                                    {images.map((uri, index) => (
                                        <View key={index} style={styles.imagePreviewContainer}>
                                            <Image source={{ uri }} style={styles.imagePreview} />
                                            <TouchableOpacity
                                                style={styles.removeImageButton}
                                                onPress={() => setImages(images.filter((_, i) => i !== index))}
                                            >
                                                <Ionicons name="close-circle" size={24} color={Colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveListing}>
                            <Text style={styles.saveButtonText}>
                                {editingListing ? 'Update Listing' : 'Create Listing'}
                            </Text>
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
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: Spacing.xs,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.surface,
        opacity: 0.9,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },
    addButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    addButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    addButtonText: {
        color: Colors.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
    listingsGrid: {
        gap: Spacing.md,
    },
    listingCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    listingImage: {
        width: '100%',
        height: 200,
        backgroundColor: Colors.border,
    },
    listingBadge: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        backgroundColor: Colors.success,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    listingBadgeText: {
        color: Colors.surface,
        fontSize: 11,
        fontWeight: 'bold',
    },
    listingContent: {
        padding: Spacing.md,
    },
    listingRoomType: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    listingDescription: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
        lineHeight: 20,
    },
    listingPrice: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: Spacing.sm,
    },
    priceAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    priceUnit: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginLeft: 4,
    },
    listingDetails: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    amenitiesPreview: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
        flexWrap: 'wrap',
    },
    amenityIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    amenitiesMore: {
        fontSize: 12,
        color: Colors.textSecondary,
        alignSelf: 'center',
    },
    listingActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        gap: 4,
    },
    editButton: {
        backgroundColor: Colors.primary + '20',
    },
    editButtonText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: Colors.danger + '20',
    },
    deleteButtonText: {
        color: Colors.danger,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xl * 2,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginTop: Spacing.md,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
        textAlign: 'center',
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
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        gap: Spacing.lg,
    },
    stepperButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.primary,
        minWidth: 60,
        textAlign: 'center',
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    amenityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        gap: 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    amenityChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    amenityChipText: {
        fontSize: 12,
        color: Colors.text,
        fontWeight: '500',
    },
    amenityChipTextActive: {
        color: Colors.surface,
    },
    imagePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        gap: Spacing.sm,
        borderWidth: 2,
        borderColor: Colors.border,
        borderStyle: 'dashed',
    },
    imagePickerText: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: '600',
    },
    imagesPreview: {
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    imagePreviewContainer: {
        position: 'relative',
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: BorderRadius.md,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: Colors.surface,
        borderRadius: 12,
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