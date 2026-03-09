import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { getAllNodes, getShortestPath } from '../../services/neo4j';

const NODE_TYPE_CONFIG = {
    HeritageSite: { icon: 'earth',           color: '#2E86AB', bg: '#EFF9FF', label: 'Heritage Sites'  },
    Temple:       { icon: 'business',        color: '#A23B72', bg: '#FFF0F7', label: 'Temples'         },
    Stupa:        { icon: 'radio-button-on', color: '#F18F01', bg: '#FFF8EF', label: 'Stupas'          },
    Palace:       { icon: 'home',            color: '#C73E1D', bg: '#FFF3F0', label: 'Palaces'         },
    King:         { icon: 'person',          color: '#3B1F2B', bg: '#F5F0F5', label: 'Kings'           },
    Dynasty:      { icon: 'people',          color: '#44BBA4', bg: '#F0FBF9', label: 'Dynasties'       },
    Reservoir:    { icon: 'water',           color: '#1A6B8A', bg: '#EFF7FB', label: 'Reservoirs'      },
};

function PathVisualizer({ path, onNodePress }) {
    if (!path) return null;
    const items = [];
    path.nodes.forEach((node, i) => {
        items.push({ type: 'node', ...node });
        if (i < path.relTypes.length) {
            items.push({ type: 'rel', label: path.relTypes[i] });
        }
    });

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pathScroll}>
            <View style={styles.pathRow}>
                {items.map((item, i) => {
                    if (item.type === 'rel') {
                        return (
                            <View key={i} style={styles.pathRelWrap}>
                                <View style={styles.pathLine} />
                                <View style={styles.pathRelChip}>
                                    <Text style={styles.pathRelText}>{item.label.replace(/_/g, ' ')}</Text>
                                </View>
                                <View style={styles.pathLine} />
                                <Ionicons name="arrow-forward" size={12} color="#888" />
                            </View>
                        );
                    }
                    const cfg = NODE_TYPE_CONFIG[item.type] || { icon: 'ellipse', color: '#888', bg: '#eee' };
                    return (
                        <TouchableOpacity key={i}
                            style={[styles.pathNodeChip, { backgroundColor: cfg.bg, borderColor: cfg.color + '55' }]}
                            onPress={() => onNodePress(item.name)}>
                            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                            <Text style={[styles.pathNodeText, { color: cfg.color }]}>{item.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );
}

export default function KgExploreScreen() {
    const router = useRouter();
    const [allNodes,   setAllNodes]   = useState([]);
    const [grouped,    setGrouped]    = useState({});
    const [loading,    setLoading]    = useState(true);
    const [activeTab,  setActiveTab]  = useState('All');
    const [pathFrom,   setPathFrom]   = useState(null);
    const [pathTo,     setPathTo]     = useState(null);
    const [path,       setPath]       = useState(null);
    const [pathMode,   setPathMode]   = useState(false);
    const [pathLoading,setPathLoading]= useState(false);

    useEffect(() => {
        (async () => {
            try {
                const nodes = await getAllNodes();
                setAllNodes(nodes);
                const g = {};
                nodes.forEach(n => {
                    if (!g[n.nodeType]) g[n.nodeType] = [];
                    g[n.nodeType].push(n);
                });
                setGrouped(g);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    const tabs = ['All', ...Object.keys(grouped)];
    const displayNodes = activeTab === 'All' ? allNodes : (grouped[activeTab] || []);

    const findPath = async (from, to) => {
        setPathLoading(true);
        setPath(null);
        try {
            const result = await getShortestPath(from.name, to.name);
            setPath(result);
        } catch (e) { console.error(e); }
        finally { setPathLoading(false); }
    };

    const handleNodePress = useCallback((node) => {
        if (pathMode === 'from') {
            setPathFrom(node); setPathMode('to'); setPath(null);
        } else if (pathMode === 'to') {
            setPathTo(node); setPathMode(false); findPath(pathFrom, node);
        } else {
            router.push({ pathname: '/kg-site-detail', params: { name: node.name } });
        }
    }, [pathMode, pathFrom]);

    const resetPath = () => { setPathFrom(null); setPathTo(null); setPath(null); setPathMode(false); };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading all entities…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Relationship Explorer</Text>
                <TouchableOpacity
                    style={[styles.pathBtn, pathMode && styles.pathBtnActive]}
                    onPress={() => { if (pathMode) { resetPath(); } else { setPathMode('from'); setPathFrom(null); setPathTo(null); setPath(null); } }}>
                    <Ionicons name="git-branch-outline" size={18} color="#fff" />
                    <Text style={styles.pathBtnText}>{pathMode ? 'Cancel' : 'Path'}</Text>
                </TouchableOpacity>
            </View>

            {/* Path Panel */}
            {(pathMode || pathFrom) && (
                <View style={styles.pathPanel}>
                    <Text style={styles.pathPanelTitle}>
                        {pathMode === 'from' && '① Tap a node to set START'}
                        {pathMode === 'to'   && `② Tap END node  (From: ${pathFrom?.name})`}
                        {!pathMode && pathFrom && 'Shortest Path Result:'}
                    </Text>
                    {pathLoading && <ActivityIndicator size="small" color="#fff" style={{ marginTop: 4 }} />}
                    {path && (
                        <PathVisualizer
                            path={path}
                            onNodePress={(name) => router.push({ pathname: '/kg-site-detail', params: { name } })}
                        />
                    )}
                    {!pathLoading && !pathMode && pathFrom && !path && (
                        <Text style={styles.pathNoResult}>No path found between these nodes</Text>
                    )}
                    {pathFrom && pathTo && (
                        <View style={styles.pathFromTo}>
                            <View style={styles.pathTag}><Text style={styles.pathTagText}>FROM: {pathFrom.name}</Text></View>
                            <Ionicons name="arrow-forward" size={14} color="#fff" />
                            <View style={[styles.pathTag, { backgroundColor: '#A23B72' }]}>
                                <Text style={styles.pathTagText}>TO: {pathTo.name}</Text>
                            </View>
                            <TouchableOpacity onPress={resetPath} style={styles.pathReset}>
                                <Ionicons name="refresh" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Type Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
                {tabs.map(tab => {
                    const cfg = NODE_TYPE_CONFIG[tab];
                    const isActive = activeTab === tab;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, isActive && styles.tabActive, isActive && cfg && { backgroundColor: cfg.color }]}
                            onPress={() => setActiveTab(tab)}>
                            {cfg && <Ionicons name={cfg.icon} size={13} color={isActive ? '#fff' : cfg.color} />}
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                            <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                                {tab === 'All' ? allNodes.length : (grouped[tab]?.length || 0)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Path mode hint */}
            {pathMode && (
                <View style={styles.pathInstructions}>
                    <Ionicons name="information-circle" size={15} color="#F59E0B" />
                    <Text style={styles.pathInstructText}>
                        {pathMode === 'from' ? 'Tap any node to set the start point' : 'Now tap the destination node'}
                    </Text>
                </View>
            )}

            {/* Node Grid */}
            <FlatList
                data={displayNodes}
                keyExtractor={(item, i) => `${item.name}-${i}`}
                numColumns={2}
                contentContainerStyle={styles.grid}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const cfg    = NODE_TYPE_CONFIG[item.nodeType] || { icon: 'ellipse', color: '#888', bg: '#F5F5F5' };
                    const isFrom = pathFrom?.name === item.name;
                    const isTo   = pathTo?.name   === item.name;
                    return (
                        <TouchableOpacity
                            style={[
                                styles.nodeCard,
                                { borderColor: cfg.color + '33' },
                                isFrom && styles.nodeCardFrom,
                                isTo   && styles.nodeCardTo,
                            ]}
                            onPress={() => handleNodePress(item)}>
                            {(isFrom || isTo) && (
                                <View style={[styles.nodeSelBadge, { backgroundColor: isFrom ? '#44BBA4' : '#A23B72' }]}>
                                    <Text style={styles.nodeSelBadgeText}>{isFrom ? 'FROM' : 'TO'}</Text>
                                </View>
                            )}
                            <View style={[styles.nodeIconWrap, { backgroundColor: cfg.bg }]}>
                                <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                            </View>
                            <Text style={styles.nodeName} numberOfLines={2}>{item.name}</Text>
                            <View style={[styles.nodeTypeBadge, { backgroundColor: cfg.color }]}>
                                <Text style={styles.nodeTypeBadgeText}>{item.nodeType}</Text>
                            </View>
                            {item.location && (
                                <Text style={styles.nodeLocation} numberOfLines={1}>
                                    <Ionicons name="location-outline" size={10} color="#aaa" />{' '}{item.location}
                                </Text>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: '#F5F7FA' },
    centered:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
    loadingText:     { marginTop: 12, color: Colors.textSecondary },
    header:          { backgroundColor: '#1A1A2E', flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 12 },
    backBtn:         { padding: 4 },
    headerTitle:     { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
    pathBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    pathBtnActive:   { backgroundColor: '#F59E0B99' },
    pathBtnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
    pathPanel:       { backgroundColor: '#16213E', padding: 14, gap: 8 },
    pathPanelTitle:  { color: '#fff', fontSize: 13, fontWeight: '600' },
    pathFromTo:      { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    pathTag:         { backgroundColor: '#44BBA4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    pathTagText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
    pathReset:       { backgroundColor: '#ffffff22', borderRadius: 6, padding: 4 },
    pathNoResult:    { color: '#ffffff88', fontSize: 12 },
    pathInstructions:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 10, gap: 6 },
    pathInstructText:{ fontSize: 12, color: '#92400E', flex: 1 },
    pathScroll:      { marginTop: 4 },
    pathRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    pathNodeChip:    { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 140 },
    pathNodeText:    { fontSize: 11, fontWeight: '700' },
    pathRelWrap:     { flexDirection: 'row', alignItems: 'center' },
    pathLine:        { width: 8, height: 2, backgroundColor: '#555' },
    pathRelChip:     { backgroundColor: '#333', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
    pathRelText:     { color: '#fff', fontSize: 8, fontWeight: '700', fontFamily: 'monospace' },
    tabsScroll:      { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', maxHeight: 52 },
    tab:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
    tabActive:       { borderRadius: 0 },
    tabText:         { fontSize: 13, color: '#666', fontWeight: '600' },
    tabTextActive:   { color: '#fff' },
    tabCount:        { fontSize: 11, color: '#aaa', fontWeight: '700' },
    tabCountActive:  { color: '#ffffff88' },
    grid:            { padding: 12 },
    nodeCard:        { flex: 1, backgroundColor: '#fff', borderRadius: 14, margin: 6, padding: 14, borderWidth: 1.5, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, position: 'relative', overflow: 'hidden' },
    nodeCardFrom:    { borderColor: '#44BBA4', borderWidth: 2.5 },
    nodeCardTo:      { borderColor: '#A23B72', borderWidth: 2.5 },
    nodeSelBadge:    { position: 'absolute', top: 0, right: 0, borderBottomLeftRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    nodeSelBadgeText:{ color: '#fff', fontSize: 9, fontWeight: '800' },
    nodeIconWrap:    { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    nodeName:        { fontSize: 12, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', marginBottom: 6, lineHeight: 16 },
    nodeTypeBadge:   { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 4 },
    nodeTypeBadgeText:{ color: '#fff', fontSize: 9, fontWeight: '800' },
    nodeLocation:    { fontSize: 10, color: '#aaa', textAlign: 'center' },
});