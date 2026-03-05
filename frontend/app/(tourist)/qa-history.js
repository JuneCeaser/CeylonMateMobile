// frontend/app/(tourist)/qa-history.js

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Share,
    Alert,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

const { width } = Dimensions.get('window');

// ─── Helper: Intent badge config ─────────────────────────────────────────────
const getIntentConfig = (intent) => {
    switch (intent) {
        case 'WHY':
            return { color: '#7B1FA2', bg: '#F3E5F5', icon: 'help-circle' };
        case 'HOW':
            return { color: '#1565C0', bg: '#E3F2FD', icon: 'cog' };
        case 'WHAT':
            return { color: '#E65100', bg: '#FFF3E0', icon: 'information-circle' };
        case 'WHERE':
            return { color: '#00695C', bg: '#E0F2F1', icon: 'location' };
        case 'WHEN':
            return { color: '#F57C00', bg: '#FFF8E1', icon: 'time' };
        case 'WHO':
            return { color: '#AD1457', bg: '#FCE4EC', icon: 'person' };
        case 'RULES':
            return { color: '#D32F2F', bg: '#FFEBEE', icon: 'shield-checkmark' };
        default:
            return { color: '#546E7A', bg: '#ECEFF1', icon: 'chatbubble' };
    }
};

// ─── Helper: Action badge config ─────────────────────────────────────────────
const getActionConfig = (action) => {
    switch (action) {
        case 'ANSWER':
            return { color: '#2E7D32', bg: '#E8F5E9', label: 'Answered', icon: 'checkmark-circle' };
        case 'CLARIFY':
            return { color: '#F57C00', bg: '#FFF3E0', label: 'Clarified', icon: 'help-circle' };
        case 'REFUSE':
            return { color: '#D32F2F', bg: '#FFEBEE', label: 'Refused', icon: 'close-circle' };
        default:
            return { color: '#546E7A', bg: '#ECEFF1', label: action, icon: 'ellipse' };
    }
};

// ─── Helper: Route badge config ───────────────────────────────────────────────
const getRouteConfig = (route) => {
    switch (route) {
        case 'VERIFIED_QA':
            return { label: '✅ Verified', color: '#2E7D32' };
        case 'EXPERIENCE':
            return { label: '🧠 AI Knowledge', color: '#1565C0' };
        case 'NONE':
            return { label: '❌ No Source', color: '#D32F2F' };
        default:
            return { label: route, color: '#546E7A' };
    }
};

// ─── Helper: Confidence bar color ────────────────────────────────────────────
const getConfidenceColor = (confidence) => {
    if (confidence >= 0.75) return '#2E7D32';
    if (confidence >= 0.50) return '#F57C00';
    return '#D32F2F';
};

export default function QAHistoryScreen() {
    const router = useRouter();

    // ─── States ──────────────────────────────────────────────────────────────
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [expandedId, setExpandedId] = useState(null);

    // Filters available
    const filters = [
        { key: 'ALL',    label: 'All',      icon: 'list' },
        { key: 'ANSWER', label: 'Answered', icon: 'checkmark-circle' },
        { key: 'REFUSE', label: 'Refused',  icon: 'close-circle' },
    ];

    // ─── Fetch History ────────────────────────────────────────────────────────
    const fetchHistory = async () => {
        try {
            const res = await api.get('/assistant/history');
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setLogs(data);
        } catch (error) {
            console.error("Q&A history fetch error:", error.message);
            Alert.alert("Error", "Could not load your Q&A history.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Refresh every time screen is focused
    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchHistory();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    // ─── Filtered Logs ────────────────────────────────────────────────────────
    const filteredLogs = logs.filter(log => {
        if (activeFilter === 'ALL') return true;
        return log.action === activeFilter;
    });

    // ─── Share a Q&A as text ─────────────────────────────────────────────────
    const handleShareQA = async (log) => {
        try {
            const confidencePct = Math.round((log.confidence || 0) * 100);
            const shareText =
                `🎙️ My CeylonMate Cultural Q&A\n\n` +
                `❓ Question:\n"${log.question}"\n\n` +
                `💬 Answer:\n${log.answer}\n\n` +
                `📊 Confidence: ${confidencePct}%\n` +
                `🔍 Source: ${getRouteConfig(log.route).label}\n\n` +
                `#CeylonMate #SriLanka #CulturalLearning`;

            await Share.share({ message: shareText });
        } catch (error) {
            Alert.alert("Error", "Could not share this Q&A.");
        }
    };

    // ─── Toggle Expand / Collapse a card ─────────────────────────────────────
    const toggleExpand = (id) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    // ─── Format Date ─────────────────────────────────────────────────────────
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }) + '  •  ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // ─── Render Each Q&A Card ─────────────────────────────────────────────────
    const renderQACard = ({ item, index }) => {
        const intentCfg  = getIntentConfig(item.intent);
        const actionCfg  = getActionConfig(item.action);
        const routeCfg   = getRouteConfig(item.route);
        const confColor  = getConfidenceColor(item.confidence || 0);
        const confPct    = Math.round((item.confidence || 0) * 100);
        const isExpanded = expandedId === item._id;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => toggleExpand(item._id)}
                activeOpacity={0.92}
            >
                {/* ── Card Header ─────────────────────────────────────────── */}
                <View style={styles.cardHeader}>

                    {/* Index Number */}
                    <View style={styles.indexCircle}>
                        <Text style={styles.indexText}>
                            {filteredLogs.length - index}
                        </Text>
                    </View>

                    {/* Intent + Action badges */}
                    <View style={styles.badgesRow}>
                        {/* Intent Badge */}
                        <View style={[styles.intentBadge, { backgroundColor: intentCfg.bg }]}>
                            <Ionicons name={intentCfg.icon} size={11} color={intentCfg.color} />
                            <Text style={[styles.intentText, { color: intentCfg.color }]}>
                                {item.intent}
                            </Text>
                        </View>

                        {/* Action Badge */}
                        <View style={[styles.actionBadge, { backgroundColor: actionCfg.bg }]}>
                            <Ionicons name={actionCfg.icon} size={11} color={actionCfg.color} />
                            <Text style={[styles.actionText, { color: actionCfg.color }]}>
                                {actionCfg.label}
                            </Text>
                        </View>
                    </View>

                    {/* Expand / Collapse arrow */}
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#CCC"
                    />
                </View>

                {/* ── Question ────────────────────────────────────────────── */}
                <View style={styles.questionRow}>
                    <MaterialCommunityIcons name="microphone" size={16} color="#FFA000" />
                    <Text style={styles.questionText} numberOfLines={isExpanded ? 0 : 2}>
                        {item.question}
                    </Text>
                </View>

                {/* ── Answer (always visible, truncated if not expanded) ── */}
                <View style={[
                    styles.answerBox,
                    item.action === 'REFUSE' && styles.answerBoxRefuse
                ]}>
                    <Text
                        style={[
                            styles.answerText,
                            item.action === 'REFUSE' && styles.answerTextRefuse
                        ]}
                        numberOfLines={isExpanded ? 0 : 3}
                    >
                        {item.answer}
                    </Text>
                </View>

                {/* ── Expanded Details ────────────────────────────────────── */}
                {isExpanded && (
                    <View style={styles.expandedSection}>

                        {/* Confidence Bar */}
                        <View style={styles.metaBlock}>
                            <View style={styles.metaLabelRow}>
                                <Ionicons name="analytics" size={14} color={confColor} />
                                <Text style={[styles.metaLabel, { color: confColor }]}>
                                    Confidence — {confPct}%
                                </Text>
                            </View>
                            <View style={styles.confBarBg}>
                                <View
                                    style={[
                                        styles.confBarFill,
                                        {
                                            width: `${confPct}%`,
                                            backgroundColor: confColor,
                                        },
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Source Route */}
                        <View style={styles.metaBlock}>
                            <Text style={styles.metaDetailLabel}>Source</Text>
                            <Text style={[styles.metaDetailValue, { color: routeCfg.color }]}>
                                {routeCfg.label}
                            </Text>
                        </View>

                        {/* Verifier Result */}
                        {item.verifier !== 'SKIPPED' && (
                            <View style={styles.metaBlock}>
                                <Text style={styles.metaDetailLabel}>Verifier</Text>
                                <Text style={[
                                    styles.metaDetailValue,
                                    {
                                        color: item.verifier === 'SUPPORTED'
                                            ? '#2E7D32' : '#D32F2F'
                                    }
                                ]}>
                                    {item.verifier === 'SUPPORTED'
                                        ? '✅ Answer Verified'
                                        : '❌ Not Fully Supported'}
                                </Text>
                            </View>
                        )}

                        {/* Date */}
                        <View style={styles.metaBlock}>
                            <Text style={styles.metaDetailLabel}>Asked on</Text>
                            <Text style={styles.metaDetailValue}>
                                {formatDate(item.createdAt)}
                            </Text>
                        </View>

                        {/* Share button — only for answered Q&As */}
                        {item.action === 'ANSWER' && (
                            <TouchableOpacity
                                style={styles.shareBtn}
                                onPress={() => handleShareQA(item)}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[Colors.primary, '#1B5E20']}
                                    style={styles.shareBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Ionicons name="share-social" size={16} color="white" />
                                    <Text style={styles.shareBtnText}>
                                        Share This Cultural Insight
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── Card Footer ─────────────────────────────────────────── */}
                <View style={styles.cardFooter}>
                    <Text style={styles.footerDate}>
                        {formatDate(item.createdAt)}
                    </Text>
                    <Text style={styles.tapHint}>
                        {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // ─── Empty State ──────────────────────────────────────────────────────────
    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
                name="microphone-off"
                size={64}
                color="#DDD"
            />
            <Text style={styles.emptyTitle}>No Questions Yet</Text>
            <Text style={styles.emptySubtitle}>
                {activeFilter === 'ALL'
                    ? "You haven't asked the Cultural AI Assistant anything yet.\nBook an experience and use the voice assistant!"
                    : `No ${activeFilter.toLowerCase()}ed questions found.`}
            </Text>
            <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tourist)/culture')}
            >
                <Text style={styles.emptyBtnText}>Explore Experiences</Text>
            </TouchableOpacity>
        </View>
    );

    // ─── Stats Row ────────────────────────────────────────────────────────────
    const answeredCount = logs.filter(l => l.action === 'ANSWER').length;
    const refusedCount  = logs.filter(l => l.action === 'REFUSE').length;
    const avgConfidence = logs.length > 0
        ? Math.round(
            logs.reduce((sum, l) => sum + (l.confidence || 0), 0) / logs.length * 100
          )
        : 0;

    // ─── Main Render ──────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <LinearGradient
                colors={['#1B5E20', '#2E7D32']}
                style={styles.header}
            >
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={22} color="white" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleBlock}>
                        <Text style={styles.headerTitle}>My Q&A History</Text>
                        <Text style={styles.headerSubtitle}>
                            {logs.length} questions asked
                        </Text>
                    </View>

                    {/* Refresh Button */}
                    <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={() => { setRefreshing(true); fetchHistory(); }}
                    >
                        <Ionicons name="sync" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>

                {/* ── Stats Row ────────────────────────────────────────────── */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{logs.length}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                            {answeredCount}
                        </Text>
                        <Text style={styles.statLabel}>Answered</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: '#EF5350' }]}>
                            {refusedCount}
                        </Text>
                        <Text style={styles.statLabel}>Refused</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: '#FFA000' }]}>
                            {avgConfidence}%
                        </Text>
                        <Text style={styles.statLabel}>Avg Conf.</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* ── Filter Tabs ──────────────────────────────────────────────── */}
            <View style={styles.filterRow}>
                {filters.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[
                            styles.filterTab,
                            activeFilter === f.key && styles.filterTabActive
                        ]}
                        onPress={() => setActiveFilter(f.key)}
                    >
                        <Ionicons
                            name={f.icon}
                            size={14}
                            color={activeFilter === f.key ? Colors.primary : '#AAA'}
                        />
                        <Text style={[
                            styles.filterTabText,
                            activeFilter === f.key && styles.filterTabTextActive
                        ]}>
                            {f.label}
                        </Text>
                        {/* Count badge */}
                        <View style={[
                            styles.filterCountBadge,
                            activeFilter === f.key && styles.filterCountBadgeActive
                        ]}>
                            <Text style={[
                                styles.filterCountText,
                                activeFilter === f.key && styles.filterCountTextActive
                            ]}>
                                {f.key === 'ALL'
                                    ? logs.length
                                    : logs.filter(l => l.action === f.key).length}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── List ─────────────────────────────────────────────────────── */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>
                        Loading your cultural conversations...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredLogs}
                    keyExtractor={(item) => item._id}
                    renderItem={renderQACard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<EmptyState />}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.primary]}
                            tintColor={Colors.primary}
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7F5',
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleBlock: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    refreshBtn: {
        padding: 8,
    },

    // ── Stats Card ────────────────────────────────────────────────────────────
    statsCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        flexDirection: 'row',
        paddingVertical: 16,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.primary,
    },
    statLabel: {
        fontSize: 10,
        color: '#999',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 3,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 4,
    },

    // ── Filter Tabs ───────────────────────────────────────────────────────────
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 12,
        gap: 5,
        borderWidth: 1.5,
        borderColor: '#EEEEEE',
        elevation: 1,
    },
    filterTabActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#AAA',
    },
    filterTabTextActive: {
        color: Colors.primary,
    },
    filterCountBadge: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        minWidth: 20,
        alignItems: 'center',
    },
    filterCountBadgeActive: {
        backgroundColor: Colors.primary,
    },
    filterCountText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#999',
    },
    filterCountTextActive: {
        color: 'white',
    },

    // ── Loading ───────────────────────────────────────────────────────────────
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },

    // ── List ──────────────────────────────────────────────────────────────────
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },

    // ── Q&A Card ──────────────────────────────────────────────────────────────
    card: {
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    indexCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    badgesRow: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    intentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    intentText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    actionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    actionText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },

    // ── Question ──────────────────────────────────────────────────────────────
    questionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 10,
        backgroundColor: '#FFFDE7',
        borderRadius: 10,
        padding: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#FFA000',
    },
    questionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        lineHeight: 20,
    },

    // ── Answer ────────────────────────────────────────────────────────────────
    answerBox: {
        backgroundColor: '#F1F8F1',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    answerBoxRefuse: {
        backgroundColor: '#FFF5F5',
        borderLeftColor: '#D32F2F',
    },
    answerText: {
        fontSize: 13,
        color: '#444',
        lineHeight: 20,
    },
    answerTextRefuse: {
        color: '#B71C1C',
        fontStyle: 'italic',
    },

    // ── Expanded Section ──────────────────────────────────────────────────────
    expandedSection: {
        marginTop: 14,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 14,
    },
    metaBlock: {
        gap: 4,
    },
    metaLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    metaLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    confBarBg: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    confBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    metaDetailLabel: {
        fontSize: 11,
        color: '#999',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaDetailValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#333',
    },

    // ── Share Button ──────────────────────────────────────────────────────────
    shareBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 6,
        elevation: 2,
    },
    shareBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    shareBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },

    // ── Card Footer ───────────────────────────────────────────────────────────
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    footerDate: {
        fontSize: 11,
        color: '#BBB',
        fontWeight: '500',
    },
    tapHint: {
        fontSize: 10,
        color: '#CCC',
        fontStyle: 'italic',
    },

    // ── Empty State ───────────────────────────────────────────────────────────
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 30,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#CCC',
        marginTop: 10,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#BBB',
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 10,
        elevation: 3,
    },
    emptyBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
