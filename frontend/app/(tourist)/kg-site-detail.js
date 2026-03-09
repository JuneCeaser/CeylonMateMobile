import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { getNodeWithRelationships, getSiteNarrative } from '../../services/neo4j';

const REL_COLORS = {
    BUILT:                      '#44BBA4',
    RENOVATED:                  '#F18F01',
    LOCATED_IN:                 '#2E86AB',
    RULED_UNDER:                '#A23B72',
    INFLUENCED:                 '#8B5CF6',
    INFLUENCED_BY:              '#6D28D9',
    EXISTED_IN:                 '#C73E1D',
    ARCHITECTURAL_INFLUENCE_ON: '#F59E0B',
    CONNECTED_TO:               '#1A6B8A',
};

const NODE_TYPE_CONFIG = {
    HeritageSite: { icon: 'earth',           color: '#2E86AB' },
    Temple:       { icon: 'business',        color: '#A23B72' },
    Stupa:        { icon: 'radio-button-on', color: '#F18F01' },
    Palace:       { icon: 'home',            color: '#C73E1D' },
    King:         { icon: 'person',          color: '#3B1F2B' },
    Dynasty:      { icon: 'people',          color: '#44BBA4' },
    Reservoir:    { icon: 'water',           color: '#1A6B8A' },
    Era:          { icon: 'time',            color: '#8B5CF6' },
};

function RelationshipPill({ rel, name, type, direction, onPress }) {
    const color = REL_COLORS[rel] || '#888';
    const cfg   = NODE_TYPE_CONFIG[type] || { icon: 'ellipse', color: '#888' };
    return (
        <TouchableOpacity style={[styles.pill, { borderColor: color + '44', backgroundColor: color + '11' }]} onPress={onPress}>
            <Ionicons name={direction === 'incoming' ? 'arrow-back-circle' : 'arrow-forward-circle'} size={14} color={color} />
            <View style={[styles.relTag, { backgroundColor: color }]}>
                <Text style={styles.relTagText}>{rel.replace(/_/g, ' ')}</Text>
            </View>
            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
            <Text style={[styles.pillName, { color: '#1A1A2E' }]} numberOfLines={1}>{name}</Text>
        </TouchableOpacity>
    );
}

function NarrativeCard({ narrative }) {
    if (!narrative) return null;
    const { site, structures, kings, dynasties, eras, influencedSites, influencedBySites } = narrative;

    const buildNarrative = () => {
        let text = `${site.name} is a ${site.type || 'heritage site'} located in ${site.location}, inscribed by UNESCO in ${site.unescoYear}. `;

        if (eras.length > 0)       text += `It belongs to the ${eras.join(', ')} of Sri Lankan history. `;
        if (dynasties.length > 0)  text += `Associated with the ${dynasties.join(' and ')} ${dynasties.length > 1 ? 'dynasties' : 'dynasty'}, `;
        if (kings.length > 0)      text += `it was shaped by rulers including ${kings.join(', ')}. `;
        if (structures.length > 0) text += `Within this site stand remarkable structures: ${structures.join(', ')}. `;
        if (influencedBySites.length > 0) text += `Architecturally and culturally, it drew inspiration from ${influencedBySites.join(', ')}. `;
        if (influencedSites.length > 0)   text += `In turn, it influenced the development of ${influencedSites.join(', ')}. `;

        return text.trim();
    };

    return (
        <View style={styles.narrativeCard}>
            <View style={styles.narrativeHeader}>
                <Ionicons name="document-text" size={18} color="#8B5CF6" />
                <Text style={styles.narrativeTitle}>Contextual Narrative</Text>
                <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>Graph-generated</Text></View>
            </View>
            <Text style={styles.narrativeText}>{buildNarrative()}</Text>

            {/* Structured facts */}
            {kings.length > 0 && (
                <View style={styles.factRow}>
                    <Ionicons name="person" size={14} color="#3B1F2B" />
                    <Text style={styles.factLabel}>Kings:</Text>
                    <Text style={styles.factValue}>{kings.join(', ')}</Text>
                </View>
            )}
            {dynasties.length > 0 && (
                <View style={styles.factRow}>
                    <Ionicons name="people" size={14} color="#44BBA4" />
                    <Text style={styles.factLabel}>Dynasty:</Text>
                    <Text style={styles.factValue}>{dynasties.join(', ')}</Text>
                </View>
            )}
            {eras.length > 0 && (
                <View style={styles.factRow}>
                    <Ionicons name="time" size={14} color="#8B5CF6" />
                    <Text style={styles.factLabel}>Era:</Text>
                    <Text style={styles.factValue}>{eras.join(', ')}</Text>
                </View>
            )}
            {structures.length > 0 && (
                <View style={styles.factRow}>
                    <Ionicons name="business" size={14} color="#F18F01" />
                    <Text style={styles.factLabel}>Structures:</Text>
                    <Text style={styles.factValue}>{structures.join(', ')}</Text>
                </View>
            )}
        </View>
    );
}

export default function KgSiteDetailScreen() {
    const router   = useRouter();
    const { name } = useLocalSearchParams();

    const [node,      setNode]      = useState(null);
    const [narrative, setNarrative] = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const [nodeData, narrativeData] = await Promise.all([
                    getNodeWithRelationships(name),
                    getSiteNarrative(name).catch(() => null),
                ]);
                setNode(nodeData);
                setNarrative(narrativeData);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [name]);

    const navigateTo = (nodeName) => {
        router.push({ pathname: '/kg-site-detail', params: { name: nodeName } });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading node…</Text>
            </View>
        );
    }

    if (error || !node) {
        return (
            <View style={styles.centered}>
                <Ionicons name="warning" size={40} color="#F59E0B" />
                <Text style={styles.errorText}>{error || 'Node not found'}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtnAlt}>
                    <Text style={styles.backBtnAltText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const cfg = NODE_TYPE_CONFIG[node.nodeType] || { icon: 'ellipse', color: '#888' };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

            {/* ── Header ── */}
            <View style={[styles.header, { backgroundColor: cfg.color }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerBody}>
                    <View style={styles.typeTag}>
                        <Ionicons name={cfg.icon} size={12} color="#fff" />
                        <Text style={styles.typeTagText}>{node.nodeType}</Text>
                    </View>
                    <Text style={styles.headerTitle} numberOfLines={2}>{node.name}</Text>
                    {node.location && (
                        <Text style={styles.headerSub}>
                            <Ionicons name="location-outline" size={12} color="#ffffff99" />
                            {' '}{node.location}
                        </Text>
                    )}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* ── Properties ── */}
                <View style={styles.propsCard}>
                    {node.description && (
                        <Text style={styles.description}>{node.description}</Text>
                    )}
                    <View style={styles.propGrid}>
                        {node.builtYear        && <PropItem icon="hammer"     label="Built"        value={node.builtYear < 0 ? `${Math.abs(node.builtYear)} BC` : `${node.builtYear} AD`} />}
                        {node.unescoYear       && <PropItem icon="ribbon"     label="UNESCO"       value={node.unescoYear} />}
                        {node.reignStart       && <PropItem icon="calendar"   label="Reign"        value={`${node.reignStart < 0 ? Math.abs(node.reignStart)+'BC' : node.reignStart} – ${node.reignEnd < 0 ? Math.abs(node.reignEnd)+'BC' : node.reignEnd} AD`} />}
                        {node.visitorsPerYear  && <PropItem icon="people"     label="Visitors/yr"  value={node.visitorsPerYear?.toLocaleString()} />}
                        {node.height           && <PropItem icon="arrow-up"   label="Height"       value={`${node.height}m`} />}
                        {node.diameter         && <PropItem icon="ellipse"    label="Diameter"     value={`${node.diameter}m`} />}
                        {node.area             && <PropItem icon="map"        label="Area"         value={`${node.area} ha`} />}
                        {node.significance     && <PropItem icon="star"       label="Significance" value={node.significance} fullWidth />}
                    </View>
                </View>

                {/* ── Contextual Narrative (only for HeritageSites) ── */}
                {node.nodeType === 'HeritageSite' && <NarrativeCard narrative={narrative} />}

                {/* ── Outgoing Relationships ── */}
                {node.outgoing.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="arrow-forward-circle" size={16} color="#2E86AB" />
                            {'  '}Outgoing Relationships ({node.outgoing.length})
                        </Text>
                        {node.outgoing.map((o, i) => (
                            <RelationshipPill
                                key={i} rel={o.rel} name={o.target}
                                type={o.targetType} direction="outgoing"
                                onPress={() => navigateTo(o.target)}
                            />
                        ))}
                    </View>
                )}

                {/* ── Incoming Relationships ── */}
                {node.incoming.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="arrow-back-circle" size={16} color="#A23B72" />
                            {'  '}Incoming Relationships ({node.incoming.length})
                        </Text>
                        {node.incoming.map((o, i) => (
                            <RelationshipPill
                                key={i} rel={o.rel} name={o.source}
                                type={o.sourceType} direction="incoming"
                                onPress={() => navigateTo(o.source)}
                            />
                        ))}
                    </View>
                )}

                {/* ── Coordinates ── */}
                {node.latitude && (
                    <View style={styles.coordCard}>
                        <Ionicons name="navigate" size={16} color={Colors.primary} />
                        <Text style={styles.coordText}>
                            {Number(node.latitude).toFixed(4)}, {Number(node.longitude).toFixed(4)}
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function PropItem({ icon, label, value, fullWidth }) {
    return (
        <View style={[styles.propItem, fullWidth && styles.propItemFull]}>
            <Ionicons name={icon} size={13} color="#888" />
            <Text style={styles.propLabel}>{label}</Text>
            <Text style={styles.propValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: '#F5F7FA' },
    centered:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F5F7FA' },
    loadingText:     { marginTop: 12, color: Colors.textSecondary },
    errorText:       { marginTop: 12, color: '#92400E', textAlign: 'center', lineHeight: 20 },
    backBtnAlt:      { marginTop: 16, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
    backBtnAltText:  { color: '#fff', fontWeight: '700' },

    // Header
    header:          { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16 },
    backBtn:         { marginBottom: 12 },
    headerBody:      {},
    typeTag:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff33', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6, gap: 4 },
    typeTagText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
    headerTitle:     { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 },
    headerSub:       { color: '#ffffff88', fontSize: 13, marginTop: 4 },

    // Props card
    propsCard:       { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    description:     { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 14 },
    propGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    propItem:        { backgroundColor: '#F5F7FA', borderRadius: 8, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '48%' },
    propItemFull:    { maxWidth: '100%' },
    propLabel:       { fontSize: 11, color: '#888', fontWeight: '600' },
    propValue:       { fontSize: 12, color: '#1A1A2E', fontWeight: '700', flex: 1 },

    // Narrative card
    narrativeCard:   { backgroundColor: '#F5F0FF', marginHorizontal: 16, marginBottom: 4, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#8B5CF6' },
    narrativeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
    narrativeTitle:  { fontSize: 14, fontWeight: '700', color: '#6D28D9', flex: 1 },
    aiBadge:         { backgroundColor: '#8B5CF6', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    aiBadgeText:     { color: '#fff', fontSize: 10, fontWeight: '700' },
    narrativeText:   { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 12 },
    factRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
    factLabel:       { fontSize: 12, color: '#6D28D9', fontWeight: '700', minWidth: 70 },
    factValue:       { fontSize: 12, color: '#374151', flex: 1 },

    // Relationship sections
    section:         { marginHorizontal: 16, marginBottom: 4 },
    sectionTitle:    { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 10, marginTop: 16, flexDirection: 'row', alignItems: 'center' },

    // Pill
    pill:            { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8, gap: 6, backgroundColor: '#fff' },
    relTag:          { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    relTagText:      { color: '#fff', fontSize: 9, fontWeight: '800', fontFamily: 'monospace' },
    pillName:        { fontSize: 13, fontWeight: '600', flex: 1 },

    // Coord
    coordCard:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, backgroundColor: '#fff', borderRadius: 10, padding: 12 },
    coordText:       { fontSize: 13, color: Colors.textSecondary, fontFamily: 'monospace' },
});