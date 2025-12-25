import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { collection, query, where, getDocs } from 'firebase/firestore';


const { width } = Dimensions.get('window');

export default function HotelDashboard() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const [stats, setStats] = useState({
        totalBookings: 0,
        activeListings: 0,
        pendingRequests: 0,
        totalRevenue: 0,
        occupancyRate: 0,
        averageRating: 0,
    });
    const [isApproved, setIsApproved] = useState(true);

    useEffect(() => {
        loadStats();
        checkApprovalStatus();
    }, []);

    const checkApprovalStatus = () => {
        setIsApproved(userProfile?.isApproved || true);
    };

    const loadStats = async () => {
        try {
            // Mock data for now
            setStats({
                totalBookings: 45,
                activeListings: 8,
                pendingRequests: 3,
                totalRevenue: 1250000,
                occupancyRate: 78,
                averageRating: 4.6,
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    // Chart data
    const revenueData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                data: [180000, 220000, 195000, 240000, 210000, 280000],
            },
        ],
    };

    const bookingData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                data: [3, 5, 4, 7, 6, 9, 8],
            },
        ],
    };

    const chartConfig = {
        backgroundColor: Colors.surface,
        backgroundGradientFrom: Colors.surface,
        backgroundGradientTo: Colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(255, 111, 0, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(117, 117, 117, ${opacity})`,
        style: {
            borderRadius: BorderRadius.lg,
        },
        propsForDots: {
            r: '5',
            strokeWidth: '2',
            stroke: Colors.secondary,
        },
    };

    if (!isApproved) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[Colors.secondary, Colors.warning]}
                    style={styles.header}
                >
                    <Text style={styles.headerTitle}>Hotel Dashboard</Text>
                    <Text style={styles.headerSubtitle}>
                        {userProfile?.hotelName || 'Your Hotel'}
                    </Text>
                </LinearGradient>

                <View style={styles.pendingContainer}>
                    <View style={styles.pendingCard}>
                        <Ionicons name="time-outline" size={64} color={Colors.warning} />
                        <Text style={styles.pendingTitle}>Pending Approval</Text>
                        <Text style={styles.pendingText}>
                            Your hotel account is currently pending admin approval.
                            You&#39;ll be notified once your account is activated.
                        </Text>
                        <View style={styles.pendingInfo}>
                            <View style={styles.pendingInfoItem}>
                                <Ionicons name="business" size={20} color={Colors.textSecondary} />
                                <Text style={styles.pendingInfoText}>{userProfile?.hotelName}</Text>
                            </View>
                            <View style={styles.pendingInfoItem}>
                                <Ionicons name="location" size={20} color={Colors.textSecondary} />
                                <Text style={styles.pendingInfoText}>{userProfile?.hotelCity}</Text>
                            </View>
                            <View style={styles.pendingInfoItem}>
                                <Ionicons name="mail" size={20} color={Colors.textSecondary} />
                                <Text style={styles.pendingInfoText}>{userProfile?.email}</Text>
                            </View>
                        </View>
                        <Text style={styles.pendingNote}>
                            ⏱️ Average approval time: 24-48 hours
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[Colors.secondary, Colors.warning]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.hotelName}>{userProfile?.hotelName || 'Your Hotel'}</Text>
                    </View>
                    <TouchableOpacity style={styles.notificationButton}>
                        <Ionicons name="notifications-outline" size={28} color={Colors.surface} />
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>{stats.pendingRequests}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Ionicons name="calendar-outline" size={24} color={Colors.secondary} />
                        <Text style={styles.statNumber}>{stats.totalBookings}</Text>
                        <Text style={styles.statLabel}>Bookings</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="bed-outline" size={24} color={Colors.primary} />
                        <Text style={styles.statNumber}>{stats.activeListings}</Text>
                        <Text style={styles.statLabel}>Listings</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="trending-up-outline" size={24} color={Colors.success} />
                        <Text style={styles.statNumber}>{stats.occupancyRate}%</Text>
                        <Text style={styles.statLabel}>Occupancy</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Revenue Card */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Revenue Overview</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>This Month</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.revenueCard}>
                        <View style={styles.revenueHeader}>
                            <View>
                                <Text style={styles.revenueLabel}>Total Revenue</Text>
                                <Text style={styles.revenueAmount}>
                                    LKR {(stats.totalRevenue / 1000).toFixed(0)}K
                                </Text>
                            </View>
                            <View style={styles.revenueChange}>
                                <Ionicons name="trending-up" size={16} color={Colors.success} />
                                <Text style={styles.revenueChangeText}>+12.5%</Text>
                            </View>
                        </View>

                        <LineChart
                            data={revenueData}
                            width={width - Spacing.lg * 4}
                            height={180}
                            chartConfig={chartConfig}
                            bezier
                            style={styles.chart}
                            withInnerLines={false}
                            withOuterLines={false}
                            withVerticalLabels={true}
                            withHorizontalLabels={true}
                        />
                    </View>
                </View>

                {/* Bookings Chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Weekly Bookings</Text>

                    <View style={styles.chartCard}>
                        <BarChart
                            data={bookingData}
                            width={width - Spacing.lg * 4}
                            height={200}
                            chartConfig={chartConfig}
                            style={styles.chart}
                            showValuesOnTopOfBars={true}
                            withInnerLines={false}
                        />
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/(hotel)/listings')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '20' }]}>
                                <Ionicons name="add-circle" size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionText}>Add Listing</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/(hotel)/bookings')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: Colors.secondary + '20' }]}>
                                <Ionicons name="clipboard" size={32} color={Colors.secondary} />
                            </View>
                            <Text style={styles.actionText}>View Requests</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard}>
                            <View style={[styles.actionIcon, { backgroundColor: Colors.success + '20' }]}>
                                <Ionicons name="trending-up" size={32} color={Colors.success} />
                            </View>
                            <Text style={styles.actionText}>Analytics</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard}>
                            <View style={[styles.actionIcon, { backgroundColor: Colors.warning + '20' }]}>
                                <Ionicons name="settings" size={32} color={Colors.warning} />
                            </View>
                            <Text style={styles.actionText}>Settings</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Performance Metrics */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Performance Metrics</Text>

                    <View style={styles.metricsCard}>
                        <View style={styles.metricRow}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Average Rating</Text>
                                <View style={styles.ratingContainer}>
                                    <Ionicons name="star" size={20} color={Colors.warning} />
                                    <Text style={styles.metricValue}>{stats.averageRating}</Text>
                                    <Text style={styles.metricSubtext}>/5.0</Text>
                                </View>
                            </View>
                            <View style={styles.metricDivider} />
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Response Rate</Text>
                                <Text style={styles.metricValue}>98%</Text>
                            </View>
                        </View>

                        <View style={styles.metricDivider} />

                        <View style={styles.metricRow}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Avg Response Time</Text>
                                <Text style={styles.metricValue}>2.3h</Text>
                            </View>
                            <View style={styles.metricDivider} />
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Acceptance Rate</Text>
                                <Text style={styles.metricValue}>94%</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Recent Reviews */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Reviews</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                            <View style={styles.reviewerInfo}>
                                <View style={styles.reviewerAvatar}>
                                    <Text style={styles.reviewerInitial}>J</Text>
                                </View>
                                <View>
                                    <Text style={styles.reviewerName}>John Smith</Text>
                                    <View style={styles.reviewRating}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Ionicons
                                                key={star}
                                                name="star"
                                                size={12}
                                                color={Colors.warning}
                                            />
                                        ))}
                                    </View>
                                </View>
                            </View>
                            <Text style={styles.reviewDate}>2 days ago</Text>
                        </View>
                        <Text style={styles.reviewText}>
                            Excellent service and beautiful rooms. The staff was very friendly and helpful. Would definitely recommend!
                        </Text>
                    </View>

                    <View style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                            <View style={styles.reviewerInfo}>
                                <View style={styles.reviewerAvatar}>
                                    <Text style={styles.reviewerInitial}>S</Text>
                                </View>
                                <View>
                                    <Text style={styles.reviewerName}>Sarah Jones</Text>
                                    <View style={styles.reviewRating}>
                                        {[1, 2, 3, 4].map((star) => (
                                            <Ionicons
                                                key={star}
                                                name="star"
                                                size={12}
                                                color={Colors.warning}
                                            />
                                        ))}
                                        <Ionicons name="star-outline" size={12} color={Colors.warning} />
                                    </View>
                                </View>
                            </View>
                            <Text style={styles.reviewDate}>5 days ago</Text>
                        </View>
                        <Text style={styles.reviewText}>
                            Great location and comfortable stay. Breakfast was delicious.
                        </Text>
                    </View>
                </View>
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
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    greeting: {
        fontSize: 16,
        color: Colors.surface,
        opacity: 0.9,
    },
    hotelName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.surface,
    },
    notificationButton: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.danger,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadgeText: {
        color: Colors.surface,
        fontSize: 10,
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: Spacing.xs,
    },
    statLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 2,
        textAlign: 'center',
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
    },
    seeAllText: {
        fontSize: 14,
        color: Colors.secondary,
        fontWeight: '600',
    },
    revenueCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    revenueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    revenueLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    revenueAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.text,
    },
    revenueChange: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    revenueChangeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.success,
    },
    chart: {
        marginVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    chartCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    actionCard: {
        width: (width - Spacing.lg * 2 - Spacing.md) / 2,
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
    actionIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'center',
    },
    metricsCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    metricRow: {
        flexDirection: 'row',
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    metricValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
    },
    metricSubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    metricDivider: {
        width: 1,
        backgroundColor: Colors.border,
        marginHorizontal: Spacing.md,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    reviewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.secondary + '40',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reviewerInitial: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    reviewRating: {
        flexDirection: 'row',
        gap: 2,
    },
    reviewDate: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    reviewText: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    pendingContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    pendingCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    pendingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    pendingText: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing.lg,
    },
    pendingInfo: {
        width: '100%',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    pendingInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    pendingInfoText: {
        fontSize: 14,
        color: Colors.text,
    },
    pendingNote: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
});