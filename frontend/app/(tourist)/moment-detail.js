// frontend/app/(tourist)/moment-detail.js

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Share,
    Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

export default function MomentDetailScreen() {
    const router = useRouter();
    const { momentId } = useLocalSearchParams();

    // ─── States ────────────────────────────────────────────────────────────────
    const [moment, setMoment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Ref used to capture the Cultural Insight Card as an image for sharing
    const shareCardRef = useRef(null);

    // ─── Load Moment ───────────────────────────────────────────────────────────
    useEffect(() => {
        fetchMomentDetail();
    }, [momentId]);

    const fetchMomentDetail = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/moments/detail/${momentId}`);
            if (res.data.success) {
                setMoment(res.data.data);
            } else {
                Alert.alert("Error", "Could not load this memory.");
                router.back();
            }
        } catch (error) {
            console.error("Fetch moment error:", error.message);
            Alert.alert("Error", "Failed to load memory.");
            router.back();
        } finally {
            setLoading(false);
        }
    };

    // ─── Delete Moment ─────────────────────────────────────────────────────────
    const handleDelete = () => {
        Alert.alert(
            "Delete Memory",
            "This will permanently remove this cultural memory from your timeline. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setDeleting(true);
                            const res = await api.delete(`/moments/${momentId}`);
                            if (res.data.success) {
                                Alert.alert(
                                    "Deleted",
                                    "Memory removed from your timeline.",
                                    [{ text: "OK", onPress: () => router.replace('/(tourist)/profile') }]
                                );
                            }
                        } catch (error) {
                            Alert.alert("Error", "Could not delete this memory.");
                        } finally {
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    // ─── Share as Text ─────────────────────────────────────────────────────────
    const handleTextShare = async () => {
        try {
            const hashtags = moment.hashtags?.join(' ') || '#CeylonMate #SriLanka';
            const shareMessage =
                `🌿 ${moment.experienceName}\n\n` +
                `📍 ${moment.location}\n\n` +
                `✨ ${moment.caption}\n\n` +
                `🏛️ Cultural Insight:\n${moment.culturalInsight}\n\n` +
                `${hashtags}\n\n` +
                `Shared via CeylonMate 🇱🇰`;

            await Share.share({ message: shareMessage });
        } catch (error) {
            Alert.alert("Share failed", "Could not share this moment.");
        }
    };

    // ─── Share as Image Card ───────────────────────────────────────────────────
    const handleImageShare = async () => {
        try {
            setSharing(true);

            // Capture the Cultural Insight Card as an image
            const uri = await captureRef(shareCardRef, {
                format: 'jpg',
                quality: 0.95,
            });

            // Check if device supports sharing
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert("Not Supported", "Sharing is not available on this device.");
                return;
            }

            await Sharing.shareAsync(uri, {
                mimeType: 'image/jpeg',
                dialogTitle: 'Share your Cultural Memory',
            });
        } catch (error) {
            console.error("Image share error:", error.message);
            // Fallback to text share if image capture fails
            handleTextShare();
        } finally {
            setSharing(false);
        }
    };

    // ─── Format Date ───────────────────────────────────────────────────────────
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    // ─── Loading State ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loaderText}>Loading your memory...</Text>
            </View>
        );
    }

    if (!moment) return null;

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* ── Hero Image Section ───────────────────────────────────── */}
                <View style={styles.heroContainer}>
                    <Image
                        source={{ uri: moment.imageUrl }}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />

                    {/* Dark gradient over image for readability */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent']}
                        style={styles.heroTopGradient}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.heroBottomGradient}
                    />

                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={22} color="white" />
                    </TouchableOpacity>

                    {/* Delete Button */}
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDelete}
                        disabled={deleting}
                        activeOpacity={0.8}
                    >
                        {deleting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Ionicons name="trash-outline" size={22} color="white" />
                        )}
                    </TouchableOpacity>

                    {/* Experience Title over image */}
                    <View style={styles.heroTitleContainer}>
                        <Text style={styles.heroTitle}>{moment.experienceName}</Text>
                        <View style={styles.heroMetaRow}>
                            <Ionicons name="location" size={14} color={Colors.secondary} />
                            <Text style={styles.heroLocation}>{moment.location}</Text>
                            <Text style={styles.heroDot}>•</Text>
                            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.heroDate}>{formatDate(moment.createdAt)}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Content Body ─────────────────────────────────────────── */}
                <View style={styles.contentBody}>

                    {/* AI Caption Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionLabelRow}>
                            <MaterialCommunityIcons name="text-long" size={18} color={Colors.primary} />
                            <Text style={styles.sectionLabel}>AI Story</Text>
                        </View>
                        <Text style={styles.captionText}>{moment.caption}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Cultural Insight Section */}
                    <LinearGradient
                        colors={['#1B5E20', '#2E7D32']}
                        style={styles.insightCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.insightHeader}>
                            <MaterialCommunityIcons
                                name="lightbulb-on"
                                size={22}
                                color="#FFD700"
                            />
                            <Text style={styles.insightTitle}>Cultural Insight</Text>
                        </View>
                        <Text style={styles.insightText}>{moment.culturalInsight}</Text>
                    </LinearGradient>

                    {/* Hashtags Section */}
                    {moment.hashtags && moment.hashtags.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionLabelRow}>
                                <Ionicons name="pricetag" size={16} color={Colors.primary} />
                                <Text style={styles.sectionLabel}>Tags</Text>
                            </View>
                            <View style={styles.hashtagsContainer}>
                                {moment.hashtags.map((tag, index) => (
                                    <View key={index} style={styles.hashtagPill}>
                                        <Text style={styles.hashtagText}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* ── Share Cultural Insight Card ───────────────────────── */}
                    <View style={styles.section}>
                        <View style={styles.sectionLabelRow}>
                            <Ionicons name="share-social" size={16} color={Colors.primary} />
                            <Text style={styles.sectionLabel}>Share This Memory</Text>
                        </View>
                        <Text style={styles.shareDescription}>
                            Share your cultural experience with the world and inspire others to explore Sri Lanka.
                        </Text>

                        {/* ── This is the Visual Share Card ─────────────────── */}
                        {/* It gets captured as image when tourist shares */}
                        <View
                            ref={shareCardRef}
                            style={styles.shareCard}
                            collapsable={false}
                        >
                            <Image
                                source={{ uri: moment.imageUrl }}
                                style={styles.shareCardImage}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.92)']}
                                style={styles.shareCardGradient}
                            />
                            <View style={styles.shareCardContent}>
                                <View style={styles.shareCardBadge}>
                                    <Text style={styles.shareCardBadgeText}>🇱🇰 CeylonMate</Text>
                                </View>
                                <Text style={styles.shareCardTitle}>
                                    {moment.experienceName}
                                </Text>
                                <Text style={styles.shareCardLocation}>
                                    📍 {moment.location}
                                </Text>
                                <Text style={styles.shareCardCaption} numberOfLines={3}>
                                    {moment.caption}
                                </Text>
                                <View style={styles.shareCardHashtags}>
                                    <Text style={styles.shareCardHashtagText}>
                                        {moment.hashtags?.slice(0, 3).join('  ')}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {/* ── End Share Card ─────────────────────────────────── */}

                        {/* Share Buttons Row */}
                        <View style={styles.shareButtonsRow}>
                            {/* Share as Image */}
                            <TouchableOpacity
                                style={styles.shareImageBtn}
                                onPress={handleImageShare}
                                disabled={sharing}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[Colors.primary, '#1B5E20']}
                                    style={styles.shareImageBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {sharing ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons
                                                name="image-multiple"
                                                size={20}
                                                color="white"
                                            />
                                            <Text style={styles.shareImageBtnText}>
                                                Share as Card
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Share as Text */}
                            <TouchableOpacity
                                style={styles.shareTextBtn}
                                onPress={handleTextShare}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                                <Text style={styles.shareTextBtnText}>Share as Text</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },

    // ── Loader ────────────────────────────────────────────────────────────────
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        gap: 12,
    },
    loaderText: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },

    // ── Hero Image ────────────────────────────────────────────────────────────
    heroContainer: {
        width: width,
        height: height * 0.50,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroTopGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    heroBottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 55 : 40,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 55 : 40,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(211,47,47,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTitleContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: 'white',
        marginBottom: 6,
        lineHeight: 30,
    },
    heroMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexWrap: 'wrap',
    },
    heroLocation: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '600',
    },
    heroDot: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    },
    heroDate: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },

    // ── Content Body ──────────────────────────────────────────────────────────
    contentBody: {
        backgroundColor: '#FAFAFA',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -24,
        paddingTop: 24,
        paddingHorizontal: 20,
        minHeight: 500,
    },
    section: {
        marginBottom: 20,
    },
    sectionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginVertical: 20,
    },

    // ── Caption ───────────────────────────────────────────────────────────────
    captionText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 26,
        fontStyle: 'italic',
    },

    // ── Cultural Insight Card ─────────────────────────────────────────────────
    insightCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: Colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFD700',
    },
    insightText: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 15,
        lineHeight: 24,
    },

    // ── Hashtags ──────────────────────────────────────────────────────────────
    hashtagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    hashtagPill: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    hashtagText: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },

    // ── Share Section ─────────────────────────────────────────────────────────
    shareDescription: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 20,
        marginBottom: 16,
    },

    // ── Share Card (Captured as Image) ────────────────────────────────────────
    shareCard: {
        width: '100%',
        height: 280,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    shareCardImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    shareCardGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '85%',
    },
    shareCardContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 18,
    },
    shareCardBadge: {
        backgroundColor: Colors.primary,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginBottom: 8,
    },
    shareCardBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    shareCardTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 4,
    },
    shareCardLocation: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    shareCardCaption: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 8,
    },
    shareCardHashtags: {
        marginTop: 4,
    },
    shareCardHashtagText: {
        color: Colors.secondary,
        fontSize: 11,
        fontWeight: '700',
    },

    // ── Share Buttons ─────────────────────────────────────────────────────────
    shareButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    shareImageBtn: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 3,
    },
    shareImageBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    shareImageBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    shareTextBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        paddingVertical: 14,
        gap: 8,
        borderWidth: 1.5,
        borderColor: Colors.primary + '40',
        elevation: 2,
    },
    shareTextBtnText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
});
