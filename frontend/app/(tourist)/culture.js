import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TextInput, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator, 
    ScrollView,
    Modal,
    Alert,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext'; // Import Auth
import api from '../../constants/api';

export default function CultureScreen() {
    const { user, userProfile } = useAuth(); // Get logged-in tourist details
    
    const [experiences, setExperiences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // --- Booking Modal States ---
    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedExp, setSelectedExp] = useState(null);
    const [guestCount, setGuestCount] = useState(1);
    const [isBooking, setIsBooking] = useState(false);

    const categories = ['Cooking', 'Farming', 'Handicraft', 'Fishing', 'Dancing'];

    useEffect(() => {
        fetchExperiences();
    }, [searchQuery, selectedCategory]);

    const fetchExperiences = async () => {
        try {
            setLoading(true);
            let url = `/experiences?search=${searchQuery}`;
            if (selectedCategory) url += `&category=${selectedCategory}`;
            
            const response = await api.get(url);
            setExperiences(response.data);
        } catch (error) {
            console.error("Error fetching cultural data:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Open Modal and set initial booking data
     */
    const openBookingModal = (item) => {
        setSelectedExp(item);
        setGuestCount(1);
        setModalVisible(true);
    };

    /**
     * Submit Booking to Backend
     */
    const handleConfirmBooking = async () => {
        if (!user) {
            Alert.alert("Login Required", "Please log in to book an experience.");
            return;
        }

        try {
            setIsBooking(true);
            const bookingData = {
                experience: selectedExp._id,
                tourist: user.uid,
                touristName: userProfile?.name || "Anonymous Traveler",
                host: selectedExp.host, // The host ID from the experience object
                bookingDate: new Date(),
                guests: guestCount,
                totalPrice: selectedExp.price * guestCount
            };

            await api.post('/bookings/add', bookingData);
            
            Alert.alert(
                "Booking Sent! 🙏", 
                "The host has been notified. You can check the status in your bookings tab."
            );
            setModalVisible(false);
        } catch (error) {
            console.error("Booking Submission Error:", error);
            Alert.alert("Error", "Failed to send booking request. Please try again.");
        } finally {
            setIsBooking(false);
        }
    };

    const renderExperienceCard = ({ item }) => (
        <TouchableOpacity 
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => openBookingModal(item)} // Now opens modal on card click too
        >
            <Image 
                source={{ 
                    uri: item.images && item.images.length > 0 
                        ? item.images[0] 
                        : 'https://via.placeholder.com/400x250?text=CeylonMate+Culture' 
                }} 
                style={styles.cardImage} 
            />
            
            <View style={styles.priceTag}>
                <Text style={styles.priceText}>LKR {item.price.toLocaleString()}</Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.categoryRow}>
                    <Text style={styles.categoryLabel}>{item.category}</Text>
                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color={Colors.warning} />
                        <Text style={styles.ratingValue}>{item.rating || '5.0'}</Text>
                    </View>
                </View>

                <Text style={styles.experienceTitle}>{item.title}</Text>
                <Text style={styles.experienceDesc} numberOfLines={2}>{item.description}</Text>

                <View style={styles.cardFooter}>
                    <View style={styles.hostInfo}>
                        <View style={styles.hostAvatar}>
                            <Ionicons name="person" size={12} color={Colors.primary} />
                        </View>
                        <Text style={styles.hostLabel}>Verified Host</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.exploreBtn}
                        onPress={() => openBookingModal(item)}
                    >
                        <Text style={styles.exploreBtnText}>Book Now</Text>
                        <Ionicons name="calendar-outline" size={14} color={Colors.surface} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[Colors.primary, '#1B5E20']} style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.headerTitle}>Culture Hub</Text>
                        <Text style={styles.headerSubtitle}>Discover authentic Sri Lankan traditions 🇱🇰</Text>
                    </View>
                    <TouchableOpacity style={styles.notificationBtn}>
                        <Ionicons name="notifications-outline" size={26} color={Colors.surface} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={Colors.textSecondary} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search experiences..."
                        placeholderTextColor={Colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </LinearGradient>

            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    <TouchableOpacity 
                        style={[styles.chip, !selectedCategory && styles.activeChip]}
                        onPress={() => setSelectedCategory('')}
                    >
                        <Text style={[styles.chipText, !selectedCategory && styles.activeChipText]}>All</Text>
                    </TouchableOpacity>
                    {categories.map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={[styles.chip, selectedCategory === cat && styles.activeChip]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={experiences}
                    keyExtractor={(item) => item._id}
                    renderItem={renderExperienceCard}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* --- BOOKING MODAL --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Booking</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close-circle" size={30} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {selectedExp && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalExpTitle}>{selectedExp.title}</Text>
                                <Text style={styles.modalExpPrice}>LKR {selectedExp.price.toLocaleString()} / guest</Text>

                                <View style={styles.counterCard}>
                                    <Text style={styles.counterLabel}>Number of Guests</Text>
                                    <View style={styles.counterRow}>
                                        <TouchableOpacity 
                                            style={styles.countBtn}
                                            onPress={() => guestCount > 1 && setGuestCount(guestCount - 1)}
                                        >
                                            <Ionicons name="remove" size={24} color={Colors.primary} />
                                        </TouchableOpacity>
                                        <Text style={styles.countNumber}>{guestCount}</Text>
                                        <TouchableOpacity 
                                            style={styles.countBtn}
                                            onPress={() => setGuestCount(guestCount + 1)}
                                        >
                                            <Ionicons name="add" size={24} color={Colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.summaryBox}>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Subtotal ({guestCount} guests)</Text>
                                        <Text style={styles.summaryValue}>LKR {(selectedExp.price * guestCount).toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.summaryRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }]}>
                                        <Text style={styles.totalLabel}>Total Price</Text>
                                        <Text style={styles.totalValue}>LKR {(selectedExp.price * guestCount).toLocaleString()}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={styles.confirmBookingBtn}
                                    onPress={handleConfirmBooking}
                                    disabled={isBooking}
                                >
                                    {isBooking ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={styles.confirmBookingText}>Confirm Request</Text>
                                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                                        </>
                                    )}
                                </TouchableOpacity>
                                <Text style={styles.disclaimerText}>You will not be charged yet. The host must accept your request first.</Text>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: Spacing.lg },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
    headerTitle: { ...Typography.h1, color: Colors.surface },
    headerSubtitle: { ...Typography.body, color: Colors.surface, opacity: 0.9, fontSize: 14 },
    notificationBtn: { padding: 5, position: 'relative' },
    notificationDot: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, backgroundColor: Colors.secondary, borderRadius: 5, borderWidth: 1.5, borderColor: Colors.primary },
    searchBox: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, alignItems: 'center', elevation: 5 },
    searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: 16, color: Colors.text },
    filterSection: { marginVertical: Spacing.md },
    chipScroll: { paddingHorizontal: Spacing.lg },
    chip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: BorderRadius.round, backgroundColor: Colors.surface, marginRight: 10, borderWidth: 1, borderColor: Colors.border },
    activeChip: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { color: Colors.text, fontWeight: '600' },
    activeChipText: { color: Colors.surface },
    listContainer: { paddingHorizontal: Spacing.lg, paddingBottom: 30 },
    card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, overflow: 'hidden', elevation: 4 },
    cardImage: { width: '100%', height: 200 },
    priceTag: { position: 'absolute', top: 15, right: 0, backgroundColor: Colors.secondary, paddingHorizontal: 15, paddingVertical: 6, borderTopLeftRadius: BorderRadius.md, borderBottomLeftRadius: BorderRadius.md },
    priceText: { color: Colors.surface, fontWeight: 'bold', fontSize: 14 },
    cardBody: { padding: Spacing.md },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
    categoryLabel: { color: Colors.primary, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    ratingValue: { fontSize: 12, fontWeight: 'bold', color: Colors.text },
    experienceTitle: { ...Typography.h3, color: Colors.text, marginBottom: 5 },
    experienceDesc: { ...Typography.caption, lineHeight: 20, marginBottom: Spacing.md },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.background, paddingTop: Spacing.sm },
    hostInfo: { flexDirection: 'row', alignItems: 'center' },
    hostAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    hostLabel: { fontSize: 13, color: Colors.textSecondary },
    exploreBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: BorderRadius.md, gap: 5 },
    exploreBtnText: { color: Colors.surface, fontWeight: 'bold', fontSize: 14 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },

    // --- MODAL STYLES ---
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { ...Typography.h2, color: Colors.text },
    modalExpTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginBottom: 5 },
    modalExpPrice: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
    counterCard: { backgroundColor: '#f8f9fa', borderRadius: BorderRadius.lg, padding: 20, alignItems: 'center', marginBottom: 20 },
    counterLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 15 },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap: 30 },
    countBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    countNumber: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
    summaryBox: { padding: 20, backgroundColor: '#fdfdfd', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#eee', marginBottom: 25 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { color: Colors.textSecondary, fontSize: 14 },
    summaryValue: { fontWeight: '600', color: Colors.text },
    totalLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: Colors.secondary },
    confirmBookingBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: BorderRadius.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4 },
    confirmBookingText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    disclaimerText: { textAlign: 'center', color: Colors.textSecondary, fontSize: 12, marginTop: 15, fontStyle: 'italic' }
});