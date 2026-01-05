import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, Alert, Image, ScrollView, 
    TouchableOpacity, ActivityIndicator, Share, Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../constants/api'; // Your axios instance
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function MomentDetailScreen() {
    const { momentId } = useLocalSearchParams();
    const router = useRouter();
    const [moment, setMoment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (momentId) fetchMomentDetails();
    }, [momentId]);

    const fetchMomentDetails = async () => {
        try {
            const res = await api.get(`/moments/detail/${momentId}`);
            if (res.data.success) {
                setMoment(res.data.data);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            Alert.alert("Error", "Could not load memory details.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * NOVELTY: The Social Export Logic
     * Combines AI generated caption + Historical Gem for sharing
     */
    const handleSocialShare = async () => {
        try {
            const shareMessage = `✨ ${moment.caption}\n\n📜 Did you know? (Cultural Insight): ${moment.culturalInsight}\n\n📍 Location: ${moment.location}\n\n${moment.hashtags.join(' ')}\n\nPreserved via CeylonMate 🇱🇰`;
            
            await Share.share({
                message: shareMessage,
                url: moment.imageUrl, // Link to the image for some platforms
            });
        } catch (error) {
            console.log("Sharing Error:", error);
        }
    };

    if (loading) return <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />;

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Image Section */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: moment.imageUrl }} style={styles.mainImage} />
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Content Section */}
                <View style={styles.contentCard}>
                    <Text style={styles.experienceTitle}>{moment.experienceName}</Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={16} color={Colors.primary} />
                        <Text style={styles.locationText}>{moment.location}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* AI STORYTELLING CAPTION */}
                    <Text style={styles.sectionLabel}>AI Storytelling Caption</Text>
                    <Text style={styles.captionText}>{moment.caption}</Text>

                    {/* RESEARCH NOVELTY: CULTURAL INSIGHT CARD */}
                    <LinearGradient 
                        colors={[Colors.primary + '20', Colors.primary + '05']} 
                        style={styles.insightCard}
                    >
                        <View style={styles.insightHeader}>
                            <MaterialCommunityIcons name="auto-fix" size={20} color={Colors.primary} />
                            <Text style={styles.insightTitle}>Historical Gem (AI Analysis)</Text>
                        </View>
                        <Text style={styles.insightText}>{moment.culturalInsight}</Text>
                    </LinearGradient>

                    {/* TAGS */}
                    <View style={styles.tagWrapper}>
                        {moment.hashtags.map((tag, i) => (
                            <Text key={i} style={styles.tagText}>{tag} </Text>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* FLOATING EXPORT BUTTON */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleSocialShare}>
                    <Ionicons name="share-social" size={22} color="white" />
                    <Text style={styles.shareBtnText}>Export to Social Media</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    loader: { flex: 1, justifyContent: 'center' },
    imageContainer: { width: width, height: width },
    mainImage: { width: '100%', height: '100%' },
    backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 25 },
    contentCard: { marginTop: -30, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 120 },
    experienceTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 5 },
    locationText: { color: Colors.textSecondary, fontSize: 14 },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
    sectionLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.primary, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
    captionText: { fontSize: 16, color: '#444', lineHeight: 24, marginBottom: 20, fontStyle: 'italic' },
    insightCard: { padding: 20, borderRadius: BorderRadius.lg, borderLeftWidth: 4, borderLeftColor: Colors.primary },
    insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    insightTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },
    insightText: { fontSize: 15, color: '#333', lineHeight: 22 },
    tagWrapper: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, gap: 5 },
    tagText: { color: Colors.primary, fontWeight: '600' },
    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    shareBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: BorderRadius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    shareBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});