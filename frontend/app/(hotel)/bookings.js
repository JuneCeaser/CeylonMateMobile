import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function BookingsScreen() {
    const { user } = useAuth();

    const [bookings, setBookings] = useState([]);
    const [filter, setFilter] = useState('all'); // all, pending, confirmed, cancelled
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        try {
            // Mock data for now
            setBookings([
                {
                    id: '1',
                    touristName: 'John Smith',
                    touristEmail: 'john@example.com',
                    touristPhone: '+94 77 123 4567',
                    roomType: 'Deluxe Room',
                    checkIn: '2025-01-15',
                    checkOut: '2025-01-18',
                    numGuests: 2,
                    totalPrice: 36000,
                    status: 'pending',
                    specialRequests: 'Late check-in around 10 PM',
                    bookingDate: '2025-01-10',
                },
                {
                    id: '2',
                    touristName: 'Sarah Johnson',
                    touristEmail: 'sarah@example.com',
                    touristPhone: '+94 77 234 5678',
                    roomType: 'Standard Room',
                    checkIn: '2025-01-20',
                    checkOut: '2025-01-23',
                    numGuests: 2,
                    totalPrice: 24000,
                    status: 'confirmed',
                    specialRequests: 'Need baby cot',
                    bookingDate: '2025-01-08',
                },
                {
                    id: '3',
                    touristName: 'Michael Brown',
                    touristEmail: 'michael@example.com',
                    touristPhone: '+94 77 345 6789',
                    roomType: 'Suite',
                    checkIn: '2025-02-01',
                    checkOut: '2025-02-05',
                    numGuests: 3,
                    totalPrice: 60000,
                    status: 'confirmed',
                    specialRequests: 'None',
                    bookingDate: '2025-01-05',
                },
                {
                    id: '4',
                    touristName: 'Emma Wilson',
                    touristEmail: 'emma@example.com',
                    touristPhone: '+94 77 456 7890',
                    roomType: 'Standard Room',
                    checkIn: '2025-01-12',
                    checkOut: '2025-01-14',
                    numGuests: 1,
                    totalPrice: 16000,
                    status: 'cancelled',
                    specialRequests: 'None',
                    bookingDate: '2025-01-03',
                },
            ]);
        } catch (error) {
            console.error('Error loading bookings:', error);
        }
    };

    const filteredBookings = bookings.filter(booking =>
        filter === 'all' ? true : booking.status === filter
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return Colors.warning;
            case 'confirmed':
                return Colors.success;
            case 'cancelled':
                return Colors.danger;
            default:
                return Colors.textSecondary;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return 'time-outline';
            case 'confirmed':
                return 'checkmark-circle';
            case 'cancelled':
                return 'close-circle';
            default:
                return 'help-circle';
        }
    };

    const handleConfirmBooking = async (bookingId) => {
        Alert.alert(
            'Confirm Booking',
            'Are you sure you want to confirm this booking?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, 'bookings', bookingId), {
                                status: 'confirmed',
                                confirmedAt: new Date().toISOString(),
                            });
                            Alert.alert('Success', 'Booking confirmed successfully!');
                            loadBookings();
                            setShowDetailsModal(false);
                        } catch (error) {
                            console.error('Error confirming booking:', error);
                            Alert.alert('Error', 'Failed to confirm booking');
                        }
                    },
                },
            ]
        );
    };

    const handleCancelBooking = async (bookingId) => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this booking?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, 'bookings', bookingId), {
                                status: 'cancelled',
                                cancelledAt: new Date().toISOString(),
                            });
                            Alert.alert('Success', 'Booking cancelled');
                            loadBookings();
                            setShowDetailsModal(false);
                        } catch (error) {
                            console.error('Error cancelling booking:', error);
                            Alert.alert('Error', 'Failed to cancel booking');
                        }
                    },
                },
            ]
        );
    };

    const calculateNights = (checkIn, checkOut) => {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[Colors.secondary, Colors.warning]}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Bookings</Text>
                <Text style={styles.headerSubtitle}>Manage reservation requests</Text>
            </LinearGradient>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                >
                    {['all', 'pending', 'confirmed', 'cancelled'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[
                                styles.filterTab,
                                filter === tab && styles.filterTabActive,
                            ]}
                            onPress={() => setFilter(tab)}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    filter === tab && styles.filterTabTextActive,
                                ]}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                            <View
                                style={[
                                    styles.filterBadge,
                                    filter === tab && styles.filterBadgeActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.filterBadgeText,
                                        filter === tab && styles.filterBadgeTextActive,
                                    ]}
                                >
                                    {tab === 'all'
                                        ? bookings.length
                                        : bookings.filter(b => b.status === tab).length}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredBookings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={64} color={Colors.textSecondary} />
                        <Text style={styles.emptyStateText}>No bookings found</Text>
                        <Text style={styles.emptyStateSubtext}>
                            {filter === 'all'
                                ? 'You have no bookings yet'
                                : `No ${filter} bookings`}
                        </Text>
                    </View>
                ) : (
                    filteredBookings.map((booking) => (
                        <TouchableOpacity
                            key={booking.id}
                            style={styles.bookingCard}
                            onPress={() => {
                                setSelectedBooking(booking);
                                setShowDetailsModal(true);
                            }}
                        >
                            <View style={styles.bookingHeader}>
                                <View style={styles.bookingHeaderLeft}>
                                    <View style={styles.guestAvatar}>
                                        <Text style={styles.guestInitial}>
                                            {booking.touristName.charAt(0)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.guestName}>{booking.touristName}</Text>
                                        <Text style={styles.roomType}>{booking.roomType}</Text>
                                    </View>
                                </View>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusColor(booking.status) + '20' },
                                    ]}
                                >
                                    <Ionicons
                                        name={getStatusIcon(booking.status)}
                                        size={14}
                                        color={getStatusColor(booking.status)}
                                    />
                                    <Text
                                        style={[
                                            styles.statusText,
                                            { color: getStatusColor(booking.status) },
                                        ]}
                                    >
                                        {booking.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.bookingDetails}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>
                                        {booking.checkIn} → {booking.checkOut}
                                    </Text>
                                    <Text style={styles.detailSubtext}>
                                        ({calculateNights(booking.checkIn, booking.checkOut)} nights)
                                    </Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>{booking.numGuests} guests</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>
                                        LKR {booking.totalPrice.toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            {booking.status === 'pending' && (
                                <View style={styles.bookingActions}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.confirmBtn]}
                                        onPress={() => handleConfirmBooking(booking.id)}
                                    >
                                        <Ionicons name="checkmark" size={18} color={Colors.surface} />
                                        <Text style={styles.actionBtnText}>Confirm</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.declineBtn]}
                                        onPress={() => handleCancelBooking(booking.id)}
                                    >
                                        <Ionicons name="close" size={18} color={Colors.surface} />
                                        <Text style={styles.actionBtnText}>Decline</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Booking Details Modal */}
            <Modal
                visible={showDetailsModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowDetailsModal(false)}
            >
                {selectedBooking && (
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                                <Ionicons name="close" size={28} color={Colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Booking Details</Text>
                            <View style={{ width: 28 }} />
                        </View>

                        <ScrollView
                            style={styles.modalContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Status Banner */}
                            <View
                                style={[
                                    styles.statusBanner,
                                    { backgroundColor: getStatusColor(selectedBooking.status) },
                                ]}
                            >
                                <Ionicons
                                    name={getStatusIcon(selectedBooking.status)}
                                    size={32}
                                    color={Colors.surface}
                                />
                                <Text style={styles.statusBannerText}>
                                    {selectedBooking.status.toUpperCase()}
                                </Text>
                            </View>

                            {/* Guest Information */}
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Guest Information</Text>
                                <View style={styles.detailCard}>
                                    <View style={styles.detailCardRow}>
                                        <Ionicons name="person" size={20} color={Colors.primary} />
                                        <View style={styles.detailCardContent}>
                                            <Text style={styles.detailCardLabel}>Name</Text>
                                            <Text style={styles.detailCardValue}>{selectedBooking.touristName}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailCardDivider} />
                                    <View style={styles.detailCardRow}>
                                        <Ionicons name="mail" size={20} color={Colors.primary} />
                                        <View style={styles.detailCardContent}>
                                            <Text style={styles.detailCardLabel}>Email</Text>
                                            <Text style={styles.detailCardValue}>{selectedBooking.touristEmail}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailCardDivider} />
                                    <View style={styles.detailCardRow}>
                                        <Ionicons name="call" size={20} color={Colors.primary} />
                                        <View style={styles.detailCardContent}>
                                            <Text style={styles.detailCardLabel}>Phone</Text>
                                            <Text style={styles.detailCardValue}>{selectedBooking.touristPhone}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Booking Information */}
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Booking Information</Text>
                                <View style={styles.detailCard}>
                                    <View style={styles.detailCardRow}>
                                        <Ionicons name="bed" size={20} color={Colors.secondary} />
                                        <View style={styles.detailCardContent}>
                                            <Text style={styles.detailCardLabel}>Room Type</Text>
                                            <Text style={styles.detailCardValue}>{selectedBooking.roomType}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailCardDivider} />
                                    <View style={styles.detailCardRow}>
                                        <Ionicons name="calendar" size={20} color={Colors.secondary} />
                                        <View style={styles.detailCardContent}>
                                            <Text style={styles.detailCardLabel}>Check-in</Text>
                                            <Text style={styles.detailCardValue}>{selectedBooking.checkIn}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailCardDivider} />
                                    <View style={styles.detailCardRow}>
                                        <Ionicons name="calendar" size={20} color={Colors.secondary} />
                                        <View style={styles.detailCardContent}>
                                            <Text style={styles.detailCardLabel}>Check-out</Text>
                                            <Text style={styles.detailCardValue}>{selectedBooking.checkOut}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailCardDivider} />
                                    <View style={styles.detailCardRow}>
                                        <Ionicons name="moon" size={20} color={Colors.secondary} />
                                        <View style={styles.detailCardContent}>
                                            <Text style={styles.detailCardLabel}>Nights</Text>
                                            <Text style={styles.detailCardValue}>
                                                {calculateNights(selectedBooking.checkIn, selectedBooking.checkOut)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailCardDivider} />
                                    <View style={styles.detailCardRow}>
                                        <Ionicons name="people" size={20} color={Colors.secondary} />
                                        <View style={styles.detailCardContent}>
                                            <Text style={styles.detailCardLabel}>Guests</Text>
                                            <Text style={styles.detailCardValue}>{selectedBooking.numGuests}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Payment Information */}
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>Payment</Text>
                                <View style={styles.priceCard}>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.priceLabel}>Total Amount</Text>
                                        <Text style={styles.priceValue}>
                                            LKR {selectedBooking.totalPrice.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Special Requests */}
                            {selectedBooking.specialRequests && selectedBooking.specialRequests !== 'None' && (
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>Special Requests</Text>
                                    <View style={styles.requestsCard}>
                                        <Text style={styles.requestsText}>{selectedBooking.specialRequests}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Action Buttons */}
                            {selectedBooking.status === 'pending' && (
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={styles.modalConfirmBtn}
                                        onPress={() => handleConfirmBooking(selectedBooking.id)}
                                    >
                                        <Text style={styles.modalActionBtnText}>Confirm Booking</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modalDeclineBtn}
                                        onPress={() => handleCancelBooking(selectedBooking.id)}
                                    >
                                        <Text style={styles.modalActionBtnText}>Decline Booking</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {selectedBooking.status === 'confirmed' && (
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={styles.modalDeclineBtn}
                                        onPress={() => handleCancelBooking(selectedBooking.id)}
                                    >
                                        <Text style={styles.modalActionBtnText}>Cancel Booking</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                )}
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
    filterContainer: {
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    filterScroll: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.lg,
        gap: Spacing.xs,
        backgroundColor: Colors.background,
    },
    filterTabActive: {
        backgroundColor: Colors.secondary + '20',
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    filterTabTextActive: {
        color: Colors.secondary,
    },
    filterBadge: {
        backgroundColor: Colors.textSecondary + '20',
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        minWidth: 20,
        alignItems: 'center',
    },
    filterBadgeActive: {
        backgroundColor: Colors.secondary,
    },
    filterBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.textSecondary,
    },
    filterBadgeTextActive: {
        color: Colors.surface,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },
    bookingCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    bookingHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
    },
    guestAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.secondary + '40',
        justifyContent: 'center',
        alignItems: 'center',
    },
    guestInitial: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    guestName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    roomType: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    bookingDetails: {
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    detailText: {
        fontSize: 14,
        color: Colors.text,
    },
    detailSubtext: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    bookingActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        gap: 4,
    },
    confirmBtn: {
        backgroundColor: Colors.success,
    },
    declineBtn: {
        backgroundColor: Colors.danger,
    },
    actionBtnText: {
        color: Colors.surface,
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
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    statusBannerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.surface,
    },
    detailSection: {
        marginBottom: Spacing.lg,
    },
    detailSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    detailCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    detailCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    detailCardContent: {
        flex: 1,
    },
    detailCardLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    detailCardValue: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    detailCardDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.sm,
    },
    priceCard: {
        backgroundColor: Colors.secondary + '20',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    priceValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    requestsCard: {
        backgroundColor: Colors.accent + '20',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    requestsText: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    modalActions: {
        gap: Spacing.sm,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    modalConfirmBtn: {
        backgroundColor: Colors.success,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    modalDeclineBtn: {
        backgroundColor: Colors.danger,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    modalActionBtnText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
});