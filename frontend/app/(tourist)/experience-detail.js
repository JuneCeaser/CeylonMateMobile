import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, 
    ActivityIndicator, Alert, Dimensions, Modal, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';

const { width } = Dimensions.get('window');

export default function ExperienceDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user, userProfile } = useAuth();
    const recordingRef = useRef(null);
    
    const [exp, setExp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiVisible, setAiVisible] = useState(false);
    const [aiText, setAiText] = useState("");
    const [wishlisted, setWishlisted] = useState(false);
    
    const [isModalVisible, setModalVisible] = useState(false);
    const [guestCount, setGuestCount] = useState(1);
    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        fetchDetails();
        prepareAudio(); // Pre-initialize audio engine
        return () => { 
            Speech.stop(); 
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync().catch(() => {});
            }
        };
    }, [id]);

    const fetchDetails = async () => {
        try {
            const res = await api.get(`/experiences/${id}`);
            setExp(res.data);
        } catch (e) {
            Alert.alert("Error", "Could not load experience details.");
            router.replace('/(tourist)/culture');
        } finally {
            setLoading(false);
        }
    };

    // FIX: Pre-initialize Audio to avoid first-touch "Busy" error
    const prepareAudio = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
        } catch (e) {
            console.error("Audio init error:", e);
        }
    };

    // --- Voice Assistant Logic ---
    const startRecording = async () => {
        try {
            const { status } = await Audio.getPermissionsAsync();
            if (status !== 'granted') {
                const { status: newStatus } = await Audio.requestPermissionsAsync();
                if (newStatus !== 'granted') return;
            }

            // Reset UI states
            setAiVisible(false);
            setAiText("");
            Speech.stop(); 

            // Initialize Recording
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            recordingRef.current = recording;
            setIsListening(true);
        } catch (err) { 
            console.error("Start recording error:", err);
            setIsListening(false);
        }
    };

    const stopRecording = async () => {
        if (!recordingRef.current) return;
        setIsListening(false);

        try {
            // Wait for recording to stop and unload properly
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null; // Clear ref

            if (uri) {
                // Delay upload slightly to ensure file is finalized on storage
                setTimeout(() => {
                    handleVoiceQuery(uri);
                }, 600);
            }
        } catch (err) { 
            console.error("Stop recording error:", err);
            setIsAiProcessing(false);
        }
    };

    const handleVoiceQuery = async (uri) => {
        setIsAiProcessing(true);
        try {
            const formData = new FormData();
            formData.append('audio', { 
                uri, 
                type: 'audio/m4a', 
                name: `voice_${Date.now()}.m4a` 
            });

            const response = await api.post('/ai/cultural-assistant-voice', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000, 
            });

            if (response.data.answer) {
                setAiText(response.data.answer);
                setAiVisible(true);
                Speech.speak(response.data.answer, { rate: 0.85, pitch: 1.0 });
            }
        } catch (error) { 
            console.error("AI Post Error:", error.response?.data || error.message);
            Alert.alert("Assistant Busy", "System is calibrating. Please try again in a moment."); 
        } finally { 
            setIsAiProcessing(false); 
        }
    };

    const handleConfirmBooking = async () => {
        if (!user) { Alert.alert("Login Required", "Please sign in to book."); return; }
        setIsBooking(true);
        try {
            const bookingData = {
                experience: exp._id,
                tourist: user.uid,
                touristName: userProfile?.name || "Traveler",
                host: exp.host,
                hostName: exp.hostName || "Host",
                bookingDate: new Date(),
                guests: guestCount,
                totalPrice: exp.price * guestCount
            };
            await api.post('/bookings/add', bookingData);
            setModalVisible(false);
            Alert.alert("Success!", "Booking request sent to host.", [
                { text: "OK", onPress: () => router.replace('/(tourist)/my-bookings') }
            ]);
        } catch (e) { 
            Alert.alert("Error", "Booking failed. Check your connection."); 
        } finally { setIsBooking(false); }
    };

    if (loading) return <ActivityIndicator size="large" color="#2E7D32" style={styles.loader} />;

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
                <View style={styles.heroContainer}>
                    <Image source={{ uri: exp?.images?.[0] }} style={styles.heroImg} />
                    <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.headerGradient}>
                        <View style={styles.headerRow}>
                            <TouchableOpacity onPress={() => router.replace('/(tourist)/culture')} style={styles.backBtn} activeOpacity={0.7}>
                                <Ionicons name="arrow-back" size={24} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Experience Insight</Text>
                            <TouchableOpacity onPress={() => setWishlisted(!wishlisted)}>
                                <Ionicons name={wishlisted ? "heart" : "heart-outline"} size={28} color={wishlisted ? "#FF5252" : "white"} />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    <View style={styles.heroOverlay}>
                        <View style={styles.badgeRow}>
                            <View style={styles.catBadge}><Text style={styles.catText}>{exp?.category}</Text></View>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={14} color="#FFD700" />
                                <Text style={styles.ratingText}>{exp?.rating || "5.0"}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.contentBody}>
                    <Text style={styles.mainTitle}>{exp?.title}</Text>
                    <View style={styles.expertRow}>
                        <Image source={{ uri: `https://ui-avatars.com/api/?background=2E7D32&color=fff&name=${exp?.hostName}` }} style={styles.hostAvatar} />
                        <View>
                            <Text style={styles.expertLabel}>Local Expert</Text>
                            <Text style={styles.expertName}>{exp?.hostName || "Local Guide"}</Text>
                        </View>
                    </View>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.subHeading}>Cultural Context</Text>
                    <Text style={styles.mainDesc}>{exp?.description}</Text>
                    
                    <Text style={styles.subHeading}>Immersive Previews</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll}>
                        <TouchableOpacity style={styles.previewItem}>
                            <Image source={{ uri: exp?.images?.[0] }} style={styles.previewImage} />
                            <View style={styles.previewIconWrap}><Text style={styles.iconTxt}>?</Text></View>
                            <Text style={styles.previewLabel}>360° VR View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.previewItem}>
                            <Image source={{ uri: exp?.images?.[0] }} style={styles.previewImage} />
                            <View style={styles.previewIconWrap}><Ionicons name="play" size={24} color="white" /></View>
                            <Text style={styles.previewLabel}>Video Trailer</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </ScrollView>

            {/* AI PANEL */}
            {aiVisible && (
                <View style={styles.aiPanel}>
                    <View style={styles.aiContent}>
                        <View style={styles.aiTop}>
                            <Text style={styles.aiLabel}>Assistant</Text>
                            <TouchableOpacity onPress={() => {setAiVisible(false); Speech.stop();}}><Ionicons name="close-circle" size={20} color="#666" /></TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 120 }}><Markdown style={markdownStyles}>{aiText}</Markdown></ScrollView>
                    </View>
                    <View style={styles.aiPointer} />
                </View>
            )}

            {/* FIXED FOOTER */}
            <View style={styles.footerSticky}>
                <View style={styles.micSection}>
                    {!aiVisible && (
                        <View style={styles.guideWrapper}>
                            <View style={styles.speechBubble}>
                                <Text style={styles.speechText}>Ask me anything!</Text>
                            </View>
                            <View style={styles.bubbleTail} />
                        </View>
                    )}
                    <TouchableOpacity 
                        style={[styles.footerMic, isListening && styles.micActive]} 
                        onPressIn={startRecording} 
                        onPressOut={stopRecording}
                    >
                        {isAiProcessing ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="mic" size={24} color="white" />}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.bookActionBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
                    <View style={styles.priceInfo}>
                        <Text style={styles.footerPriceText}>LKR {exp?.price?.toLocaleString()}</Text>
                        <Text style={styles.footerSubText}>per guest</Text>
                    </View>
                    <View style={styles.btnDivider} />
                    <Text style={styles.bookNowText}>Book Now</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.mHeader}>Confirm Booking</Text>
                        <View style={styles.mCounter}>
                            <TouchableOpacity onPress={() => setGuestCount(Math.max(1, guestCount-1))}><Ionicons name="remove-circle" size={45} color="#2E7D32" /></TouchableOpacity>
                            <Text style={styles.mCountText}>{guestCount}</Text>
                            <TouchableOpacity onPress={() => setGuestCount(guestCount+1)}><Ionicons name="add-circle" size={45} color="#2E7D32" /></TouchableOpacity>
                        </View>
                        <View style={styles.mTotalBox}>
                            <Text style={styles.mTotalLabel}>Total Amount</Text>
                            <Text style={styles.mTotalVal}>LKR {(exp?.price * guestCount).toLocaleString()}</Text>
                        </View>
                        <TouchableOpacity style={styles.mConfirmBtn} onPress={handleConfirmBooking} disabled={isBooking}>
                            {isBooking ? <ActivityIndicator color="white" /> : <Text style={styles.mConfirmText}>Confirm Booking Request</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.mCancel}>Close</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const markdownStyles = { body: { color: '#333', fontSize: 13 } };

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    loader: { flex: 1, justifyContent: 'center' },
    heroContainer: { width: width, height: 280, position: 'relative' },
    heroImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    headerGradient: { position: 'absolute', top: 0, width: '100%', height: 100, paddingTop: 40, paddingHorizontal: 15, zIndex: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 11 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    backBtn: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 5 },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'flex-end', padding: 15 },
    badgeRow: { flexDirection: 'row', gap: 8 },
    catBadge: { backgroundColor: '#2E7D32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
    catText: { color: 'white', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
    ratingBadge: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 5, gap: 3 },
    ratingText: { fontWeight: 'bold', fontSize: 11 },
    contentBody: { paddingHorizontal: 20, paddingTop: 15 },
    mainTitle: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', marginBottom: 12 },
    expertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    hostAvatar: { width: 40, height: 40, borderRadius: 20 },
    expertLabel: { fontSize: 9, color: '#999', fontWeight: 'bold' },
    expertName: { fontSize: 15, fontWeight: '700', color: '#333' },
    sectionDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
    subHeading: { fontSize: 16, fontWeight: '800', color: '#2E7D32', marginBottom: 8 },
    mainDesc: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 20 },
    previewScroll: { marginTop: 5 },
    previewItem: { width: 150, marginRight: 15, alignItems: 'center' },
    previewImage: { width: 150, height: 95, borderRadius: 12 },
    previewIconWrap: { position: 'absolute', top: 25, backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 25 },
    iconTxt: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    previewLabel: { fontSize: 11, fontWeight: '700', marginTop: 5, color: '#444' },
    footerSticky: { position: 'absolute', bottom: 0, width: width, backgroundColor: 'white', paddingHorizontal: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 10, paddingTop: 10, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE', zIndex: 50 },
    micSection: { flex: 0.2, alignItems: 'center' },
    guideWrapper: { position: 'absolute', bottom: 65, left: -10, width: 140 },
    speechBubble: { backgroundColor: '#2E7D32', padding: 8, borderRadius: 10, width: '100%' },
    speechText: { color: 'white', fontSize: 10, fontWeight: '600', textAlign: 'center' },
    bubbleTail: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#2E7D32', marginLeft: 18, marginTop: -1 },
    footerMic: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFA000', justifyContent: 'center', alignItems: 'center', elevation: 3 },
    micActive: { backgroundColor: '#D32F2F' },
    bookActionBtn: { flex: 0.8, backgroundColor: '#2E7D32', height: 52, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginLeft: 10 },
    priceInfo: { flex: 1 },
    footerPriceText: { color: 'white', fontSize: 15, fontWeight: '800' },
    footerSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
    btnDivider: { width: 1, height: '50%', backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10 },
    bookNowText: { color: 'white', fontSize: 14, fontWeight: '800' },
    aiPanel: { position: 'absolute', bottom: 100, left: 15, right: 15, zIndex: 1000 },
    aiContent: { backgroundColor: 'white', borderRadius: 15, padding: 15, elevation: 15, borderLeftWidth: 4, borderLeftColor: '#2E7D32' },
    aiTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    aiLabel: { fontSize: 10, fontWeight: 'bold', color: '#2E7D32' },
    aiPointer: { width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderTopWidth: 15, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'white', alignSelf: 'flex-start', marginLeft: 30, marginTop: -1 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' },
    modalContent: { backgroundColor: 'white', margin: 40, borderRadius: 20, padding: 25, alignItems: 'center' },
    mHeader: { fontSize: 18, fontWeight: '800', marginBottom: 15 },
    mCounter: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
    mCountText: { fontSize: 24, fontWeight: 'bold' },
    mTotalBox: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#F9F9F9', borderRadius: 12, marginBottom: 20 },
    mTotalLabel: { color: '#666' },
    mTotalVal: { fontWeight: 'bold', color: '#2E7D32', fontSize: 16 },
    mConfirmBtn: { backgroundColor: '#2E7D32', width: '100%', padding: 12, borderRadius: 10 },
    mConfirmText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
    mCancel: { marginTop: 15, color: '#D32F2F', fontSize: 12 }
});