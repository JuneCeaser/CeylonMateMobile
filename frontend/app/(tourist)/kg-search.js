import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { searchNodes } from '../../services/neo4j';

const NODE_TYPE_CONFIG = {
    HeritageSite: { icon: 'earth',           color: '#2E86AB', bg: '#EFF9FF' },
    Temple:       { icon: 'business',        color: '#A23B72', bg: '#FFF0F7' },
    Stupa:        { icon: 'radio-button-on', color: '#F18F01', bg: '#FFF8EF' },
    Palace:       { icon: 'home',            color: '#C73E1D', bg: '#FFF3F0' },
    King:         { icon: 'person',          color: '#3B1F2B', bg: '#F5F0F5' },
    Dynasty:      { icon: 'people',          color: '#44BBA4', bg: '#F0FBF9' },
    Reservoir:    { icon: 'water',           color: '#1A6B8A', bg: '#EFF7FB' },
    Era:          { icon: 'time',            color: '#8B5CF6', bg: '#F5F0FF' },
};

const QUICK_SEARCHES = [
    { label: 'Stupas',    query: 'stupa'    },
    { label: 'Temples',   query: 'temple'   },
    { label: 'Kings',     query: 'king'     },
    { label: 'Kandy',     query: 'Kandy'    },
    { label: 'Anuradhapura', query: 'Anuradhapura' },
    { label: 'Palaces',   query: 'palace'   },
];

export default function KgSearchScreen() {
    const router      = useRouter();
    const inputRef    = useRef(null);
    const [query,     setQuery]     = useState('');
    const [results,   setResults]   = useState([]);
    const [loading,   setLoading]   = useState(false);
    const [searched,  setSearched]  = useState(false);
    const [debounce,  setDebounce]  = useState(null);

    const doSearch = useCallback(async (text) => {
        if (!text.trim() || text.trim().length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        setSearched(true);
        try {
            const data = await searchNodes(text.trim());
            setResults(data);
        } catch (e) {
            console.error(e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleChangeText = (text) => {
        setQuery(text);
        if (debounce) clearTimeout(debounce);
        const t = setTimeout(() => doSearch(text), 400);
        setDebounce(t);
    };

    const handleQuick = (q) => {
        setQuery(q);
        doSearch(q);
        Keyboard.dismiss();
    };

    const navigateTo = (item) => {
        router.push({ pathname: '/kg-site-detail', params: { name: item.name } });
    };

    const renderItem = ({ item }) => {
        const cfg = NODE_TYPE_CONFIG[item.nodeType] || { icon: 'ellipse', color: '#888', bg: '#F5F5F5' };
        return (
            <TouchableOpacity style={styles.resultCard} onPress={() => navigateTo(item)}>
                <View style={[styles.resultIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                </View>
                <View style={styles.resultBody}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <View style={styles.resultMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: cfg.color }]}>
                            <Text style={styles.typeBadgeText}>{item.nodeType}</Text>
                        </View>
                        {item.location && (
                            <Text style={styles.resultLocation}>
                                <Ionicons name="location-outline" size={11} color={Colors.textSecondary} />
                                {' '}{item.location}
                            </Text>
                        )}
                    </View>
                    {item.description && (
                        <Text style={styles.resultDesc} numberOfLines={2}>{item.description}</Text>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Search Knowledge Graph</Text>
            </View>

            {/* ── Search Bar ── */}
            <View style={styles.searchBarWrap}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search kings, temples, stupas, sites…"
                        placeholderTextColor="#aaa"
                        value={query}
                        onChangeText={handleChangeText}
                        returnKeyType="search"
                        onSubmitEditing={() => doSearch(query)}
                        autoFocus
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
                            <Ionicons name="close-circle" size={18} color="#aaa" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Quick Searches ── */}
            {!searched && (
                <View style={styles.quickWrap}>
                    <Text style={styles.quickTitle}>Quick Searches</Text>
                    <View style={styles.quickRow}>
                        {QUICK_SEARCHES.map((q, i) => (
                            <TouchableOpacity key={i} style={styles.quickChip} onPress={() => handleQuick(q.query)}>
                                <Text style={styles.quickChipText}>{q.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Type legend */}
                    <Text style={styles.quickTitle}>Node Types</Text>
                    <View style={styles.typeLegend}>
                        {Object.entries(NODE_TYPE_CONFIG).map(([type, cfg]) => (
                            <TouchableOpacity key={type} style={[styles.typeCard, { backgroundColor: cfg.bg, borderColor: cfg.color + '44' }]}
                                onPress={() => handleQuick(type.toLowerCase())}>
                                <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                                <Text style={[styles.typeCardText, { color: cfg.color }]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* ── Results ── */}
            {loading && (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>Querying graph…</Text>
                </View>
            )}

            {!loading && searched && results.length === 0 && (
                <View style={styles.emptyWrap}>
                    <Ionicons name="search-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyTitle}>No results found</Text>
                    <Text style={styles.emptyDesc}>Try searching for a temple, king, or heritage site</Text>
                </View>
            )}

            {!loading && results.length > 0 && (
                <FlatList
                    data={results}
                    keyExtractor={(item, i) => `${item.name}-${i}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <Text style={styles.resultsCount}>{results.length} result{results.length !== 1 ? 's' : ''} found</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container:     { flex: 1, backgroundColor: '#F5F7FA' },

    // Header
    header:        { backgroundColor: '#1A1A2E', flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, gap: 12 },
    backBtn:       { padding: 4 },
    headerTitle:   { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },

    // Search bar
    searchBarWrap: { backgroundColor: '#1A1A2E', paddingHorizontal: 16, paddingBottom: 16 },
    searchBar:     { backgroundColor: '#fff', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    searchInput:   { flex: 1, fontSize: 15, color: '#1A1A2E' },

    // Quick
    quickWrap:     { flex: 1, padding: 16 },
    quickTitle:    { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    quickRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    quickChip:     { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E0E0E0' },
    quickChipText: { fontSize: 13, color: '#1A1A2E', fontWeight: '600' },
    typeLegend:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeCard:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
    typeCardText:  { fontSize: 12, fontWeight: '700' },

    // Loading / empty
    loadingWrap:   { alignItems: 'center', marginTop: 40, gap: 8 },
    loadingText:   { color: Colors.textSecondary, fontSize: 13 },
    emptyWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#999' },
    emptyDesc:     { fontSize: 13, color: '#bbb', textAlign: 'center' },

    // Results
    listContent:   { padding: 16 },
    resultsCount:  { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, fontWeight: '600' },
    resultCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    resultIcon:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    resultBody:    { flex: 1 },
    resultName:    { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
    resultMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    typeBadge:     { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
    typeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    resultLocation:{ fontSize: 11, color: Colors.textSecondary },
    resultDesc:    { fontSize: 12, color: '#666', lineHeight: 17 },
});