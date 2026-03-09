import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { getAllHeritageSites, getGraphStats, seedDatabase } from '../../services/neo4j';

// ── Node type config ──────────────────────────────────────────────────────────
const NODE_TYPE_CONFIG = {
    HeritageSite: { icon: 'earth',         color: '#2E86AB', label: 'Heritage Sites'  },
    Temple:       { icon: 'business',      color: '#A23B72', label: 'Temples'         },
    Stupa:        { icon: 'radio-button-on', color: '#F18F01', label: 'Stupas'        },
    Palace:       { icon: 'home',          color: '#C73E1D', label: 'Palaces'         },
    King:         { icon: 'person',        color: '#3B1F2B', label: 'Kings'           },
    Dynasty:      { icon: 'people',        color: '#44BBA4', label: 'Dynasties'       },
    Reservoir:    { icon: 'water',         color: '#1A6B8A', label: 'Reservoirs'      },
    Era:          { icon: 'time',          color: '#8B5CF6', label: 'Eras'            },
};

export default function KnowledgeGraphScreen() {
    const router = useRouter();
    const [sites, setSites]         = useState([]);
    const [stats, setStats]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [seeding, setSeeding]     = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError]         = useState(null);

    const loadData = useCallback(async () => {
        try {
            setError(null);
            const [sitesData, statsData] = await Promise.all([
                getAllHeritageSites(),
                getGraphStats(),
            ]);
            setSites(sitesData);
            setStats(statsData.filter(s => s.label && s.label !== 'Era'));
        } catch (e) {
            console.error(e);
            setError('Could not connect to Knowledge Graph. Tap "Seed DB" to initialise.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSeed = async () => {
        Alert.alert(
            'Initialise Database',
            'This will populate the Neo4j graph with Sri Lanka heritage data. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Seed Now', onPress: async () => {
                        setSeeding(true);
                        const result = await seedDatabase();
                        setSeeding(false);
                        if (result.success) {
                            Alert.alert('✅ Success', 'Database seeded! Loading data…');
                            setLoading(true);
                            loadData();
                        } else {
                            Alert.alert('❌ Error', result.error || 'Seeding failed.');
                        }
                    }
                },
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading || seeding) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>
                    {seeding ? 'Seeding knowledge graph…' : 'Connecting to Neo4j…'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>Knowledge Graph</Text>
                    <Text style={styles.headerSubtitle}>Sri Lanka Heritage</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/kg-search')} style={styles.searchBtn}>
                    <Ionicons name="search" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* ── Banner ── */}
                <View style={styles.banner}>
                    <View style={styles.bannerIcon}>
                        <Ionicons name="git-network" size={36} color="#fff" />
                    </View>
                    <Text style={styles.bannerTitle}>Semantic Knowledge Graph</Text>
                    <Text style={styles.bannerDesc}>
                        Explore contextual relationships between Sri Lankas kings, temples, dynasties, and heritage sites — powered by Neo4j.
                    </Text>
                </View>

                {/* ── Error / Seed CTA ── */}
                {error && (
                    <View style={styles.errorCard}>
                        <Ionicons name="warning" size={22} color="#F59E0B" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.seedBtn} onPress={handleSeed}>
                            <Text style={styles.seedBtnText}>Initialise DB</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Quick Action Cards ── */}
                <Text style={styles.sectionTitle}>Explore</Text>
                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#2E86AB' }]}
                        onPress={() => router.push('/kg-explore')}>
                        <Ionicons name="git-network-outline" size={28} color="#fff" />
                        <Text style={styles.actionLabel}>Relationship{'\n'}Explorer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#A23B72' }]}
                        onPress={() => router.push('/kg-search')}>
                        <Ionicons name="search-outline" size={28} color="#fff" />
                        <Text style={styles.actionLabel}>Search{'\n'}Entities</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#44BBA4' }]}
                        onPress={handleSeed}>
                        <Ionicons name="cloud-upload-outline" size={28} color="#fff" />
                        <Text style={styles.actionLabel}>Seed{'\n'}Database</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Graph Stats ── */}
                {stats.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Graph Overview</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
                            {stats.map((s, i) => {
                                const cfg = NODE_TYPE_CONFIG[s.label] || { icon: 'ellipse', color: '#888' };
                                return (
                                    <View key={i} style={[styles.statChip, { borderColor: cfg.color }]}>
                                        <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                                        <Text style={[styles.statCount, { color: cfg.color }]}>{s.count}</Text>
                                        <Text style={styles.statLabel}>{s.label}</Text>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </>
                )}

                {/* ── Heritage Sites ── */}
                {sites.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>UNESCO Heritage Sites</Text>
                        {sites.map((site, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.siteCard}
                                onPress={() => router.push({ pathname: '/kg-site-detail', params: { name: site.name } })}
                            >
                                <View style={styles.siteCardLeft}>
                                    <View style={[styles.siteIcon, { backgroundColor: '#2E86AB22' }]}>
                                        <Ionicons name="earth" size={22} color="#2E86AB" />
                                    </View>
                                    <View style={styles.siteInfo}>
                                        <Text style={styles.siteName} numberOfLines={1}>{site.name}</Text>
                                        <Text style={styles.siteLocation}>
                                            <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                                            {' '}{site.location}  ·  UNESCO {site.unescoYear}
                                        </Text>
                                        <Text style={styles.siteStructures}>
                                            {site.structureCount} connected entities
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                {/* ── Relationship Types Legend ── */}
                <Text style={styles.sectionTitle}>Relationship Types</Text>
                <View style={styles.legendCard}>
                    {[
                        { rel: 'BUILT_BY',             desc: 'Structure constructed by a king' },
                        { rel: 'LOCATED_IN',           desc: 'Structure within a heritage site' },
                        { rel: 'RULED_UNDER',          desc: 'King ruled under a dynasty' },
                        { rel: 'INFLUENCED',           desc: 'Cultural/architectural influence' },
                        { rel: 'EXISTED_IN',           desc: 'Dynasty existed in a historical era' },
                        { rel: 'ARCHITECTURAL_INFLUENCE_ON', desc: 'Structural design inspiration' },
                        { rel: 'CONNECTED_TO',         desc: 'Spiritual/physical connection' },
                    ].map((item, i) => (
                        <View key={i} style={styles.legendRow}>
                            <View style={styles.relBadge}>
                                <Text style={styles.relBadgeText}>{item.rel}</Text>
                            </View>
                            <Text style={styles.legendDesc}>{item.desc}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: '#F5F7FA' },
    centered:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
    loadingText:     { marginTop: 12, color: Colors.textSecondary, fontSize: 14 },

    // Header
    header:          { backgroundColor: '#1A1A2E', flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn:         { padding: 4 },
    headerTitleWrap: { flex: 1, marginLeft: 12 },
    headerTitle:     { color: '#fff', fontSize: 18, fontWeight: '700' },
    headerSubtitle:  { color: '#ffffff88', fontSize: 12, marginTop: 1 },
    searchBtn:       { padding: 4 },

    // Banner
    banner:          { backgroundColor: '#1A1A2E', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, alignItems: 'center' },
    bannerIcon:      { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffffff22', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    bannerTitle:     { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
    bannerDesc:      { color: '#ffffff99', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },

    // Error
    errorCard:       { backgroundColor: '#FEF3C7', margin: 16, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
    errorText:       { color: '#92400E', fontSize: 13, textAlign: 'center', lineHeight: 18 },
    seedBtn:         { backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
    seedBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Section title
    sectionTitle:    { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },

    // Action cards
    actionRow:       { flexDirection: 'row', marginHorizontal: 16, gap: 10 },
    actionCard:      { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8 },
    actionLabel:     { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },

    // Stats
    statsScroll:     { paddingLeft: 16, marginBottom: 4 },
    statChip:        { flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10, gap: 4, minWidth: 80 },
    statCount:       { fontSize: 20, fontWeight: '800' },
    statLabel:       { fontSize: 10, color: '#666', fontWeight: '600' },

    // Site cards
    siteCard:        { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    siteCardLeft:    { flex: 1, flexDirection: 'row', alignItems: 'center' },
    siteIcon:        { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    siteInfo:        { flex: 1 },
    siteName:        { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
    siteLocation:    { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    siteStructures:  { fontSize: 11, color: '#2E86AB', marginTop: 3, fontWeight: '600' },

    // Legend
    legendCard:      { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    legendRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
    relBadge:        { backgroundColor: '#1A1A2E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 140 },
    relBadgeText:    { color: '#fff', fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
    legendDesc:      { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
});