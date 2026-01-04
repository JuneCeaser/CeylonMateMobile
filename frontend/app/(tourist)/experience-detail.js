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

const { width, height } = Dimensions.get('window');

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
    const [recognizedQuestion, setRecognizedQuestion] = useState("");
    const [wishlisted, setWishlisted] = useState(false);
    
    const [isModalVisible, setModalVisible] = useState(false);
    const [guestCount, setGuestCount] = useState(1);
    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        fetchDetails();
        prepareAudio();
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

    const handleVRNavigation = () => {
        router.push({
            pathname: '/vr-viewer',
            params: { videoUrl: exp?.vrVideoUrl } 
        });
    };

    // --- High-Focus Voice Assistant Logic ---
    const startRecording = async () => {
        try {
            const { status } = await Audio.getPermissionsAsync();
            if (status !== 'granted') {
                const { status: newStatus } = await Audio.requestPermissionsAsync();
                if (newStatus !== 'granted') return;
            }

            setAiText("");
            setRecognizedQuestion("");
            setAiVisible(false);
            Speech.stop(); 

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
        setIsAiProcessing(true); // Switch to processing state on the overlay

        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null; 

            if (uri) {
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
        try {
            const formData = new FormData();
            const fileUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
            
            formData.append('audio', { 
                uri: fileUri, 
                type: 'audio/m4a', 
                name: 'speech.m4a' 
            });

            const response = await api.post('/ai/cultural-assistant-voice', formData, {
                headers: { 
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data' 
                },
                timeout: 60000, 
            });

            if (response.data.answer) {
                setRecognizedQuestion(response.data.recognizedText || "");
                setAiText(response.data.answer);
                setIsAiProcessing(false);
                setAiVisible(true); // Display the result section within the overlay
                Speech.speak(response.data.answer, { rate: 0.9, pitch: 1.0 });
            }
        } catch (error) { 
            setIsAiProcessing(false);
            setIsListening(false);
            setAiVisible(false);
            Alert.alert("Assistant Busy", "Please try one more time."); 
        }
    };

    const closeAssistantOverlay = () => {
        Speech.stop();
        setIsListening(false);
        setIsAiProcessing(false);
        setAiVisible(false);
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
                {/* Hero Section */}
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

                {/* Body Content */}
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
                        <TouchableOpacity style={styles.previewItem} onPress={handleVRNavigation}>
                            <Image source={{ uri: exp?.images?.[0] }} style={styles.previewImage} />
                            <View style={styles.previewIconWrap}>
                                <Ionicons name="glasses-outline" size={24} color="white" />
                            </View>
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

            {/* FULL-SCREEN VOICE ASSISTANT OVERLAY */}
            <Modal visible={isListening || isAiProcessing || aiVisible} transparent animationType="fade">
                <View style={styles.voiceOverlay}>
                    <LinearGradient colors={['rgba(0,0,0,0.95)', 'rgba(20,60,30,0.98)']} style={styles.voiceOverlayGradient}>
                        
                        <View style={styles.voiceCenterContent}>
                            {isListening ? (
                                <>
                                    <View style={styles.pulseContainer}>
                                        <View style={styles.pulseCircle} />
                                        <View style={styles.micCircleActive}>
                                            <Ionicons name="mic" size={60} color="white" />
                                        </View>
                                    </View>
                                    <Text style={styles.voiceStatusText}>Listening...</Text>
                                    <Text style={styles.voiceSubText}>Go ahead, ask about Sri Lankan culture</Text>
                                </>
                            ) : isAiProcessing ? (
                                <>
                                    <ActivityIndicator size="large" color="#FFA000" style={{ marginBottom: 20 }} />
                                    <Text style={styles.voiceStatusText}>Processing...</Text>
                                    <Text style={styles.voiceSubText}>Analyzing cultural nuances</Text>
                                </>
                            ) : (
                                /* Result State: Shows Transcript + AI Answer */
                                <View style={styles.fullScreenResult}>
                                    <View style={styles.transcriptSection}>
                                        <Text style={styles.transcriptLabel}>You asked:</Text>
                                        <Text style={styles.transcriptText}>{recognizedQuestion ? `"${recognizedQuestion}"` : "Analyzing your question..."}</Text>
                                    </View>
                                    <View style={styles.aiResultDivider} />
                                    <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={true}>
                                        <View style={styles.aiHeaderRow}>
                                            <MaterialCommunityIcons name="robot-happy" size={24} color="#FFA000" />
                                            <Text style={styles.aiHeaderLabel}>CeylonMate Guide</Text>
                                        </View>
                                        <Markdown style={fullMarkdownStyles}>{aiText}</Markdown>
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Close button to return to Detail Screen */}
                        <TouchableOpacity style={styles.voiceCloseBtn} onPress={closeAssistantOverlay}>
                            <View style={styles.closeBtnContent}>
                                <Ionicons name="close-circle" size={50} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.closeBtnText}>Return to Experience</Text>
                            </View>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>

            {/* Footer and Mic Trigger */}
            <View style={styles.footerSticky}>
                <View style={styles.micSection}>
                    {!aiVisible && !isListening && (
                        <View style={styles.guideWrapper}>
                            <View style={styles.speechBubble}>
                                <Text style={styles.speechText}>Ask me anything!</Text>
                            </View>
                            <View style={styles.bubbleTail} />
                        </View>
                    )}
                    <TouchableOpacity 
                        style={styles.footerMic} 
                        onPressIn={startRecording} 
                        onPressOut={stopRecording}
                    >
                        <Ionicons name="mic" size={24} color="white" />
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

            {/* Booking Modal */}
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
const fullMarkdownStyles = { 
    body: { color: 'white', fontSize: 16, lineHeight: 24 },
    strong: { color: '#FFA000', fontWeight: 'bold' } 
};

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
    previewLabel: { fontSize: 11, fontWeight: '700', marginTop: 5, color: '#444' },
    footerSticky: { position: 'absolute', bottom: 0, width: width, backgroundColor: 'white', paddingHorizontal: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 10, paddingTop: 10, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE', zIndex: 50 },
    micSection: { flex: 0.2, alignItems: 'center' },
    guideWrapper: { position: 'absolute', bottom: 65, left: -10, width: 140 },
    speechBubble: { backgroundColor: '#2E7D32', padding: 8, borderRadius: 10, width: '100%' },
    speechText: { color: 'white', fontSize: 10, fontWeight: '600', textAlign: 'center' },
    bubbleTail: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#2E7D32', marginLeft: 18, marginTop: -1 },
    footerMic: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFA000', justifyContent: 'center', alignItems: 'center', elevation: 3 },
    bookActionBtn: { flex: 0.8, backgroundColor: '#2E7D32', height: 52, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginLeft: 10 },
    priceInfo: { flex: 1 },
    footerPriceText: { color: 'white', fontSize: 15, fontWeight: '800' },
    footerSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
    btnDivider: { width: 1, height: '50%', backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10 },
    bookNowText: { color: 'white', fontSize: 14, fontWeight: '800' },
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
    mCancel: { marginTop: 15, color: '#D32F2F', fontSize: 12 },
    
    // Voice Assistant High-Focus Overlay Styles
    voiceOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    voiceOverlayGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    voiceCenterContent: { width: '90%', alignItems: 'center' },
    pulseContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    micCircleActive: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#FFA000', justifyContent: 'center', alignItems: 'center',
        elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15
    },
    pulseCircle: {
        position: 'absolute', width: 160, height: 160, borderRadius: 80,
        backgroundColor: 'rgba(255, 160, 0, 0.3)',
    },
    voiceStatusText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
    voiceSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5, textAlign: 'center' },
    
    // Full Screen Result Display
    fullScreenResult: { 
        width: '100%', 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        borderRadius: 20, 
        padding: 20, 
        maxHeight: height * 0.65,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)'
    },
    transcriptSection: { marginBottom: 15 },
    transcriptLabel: { color: '#FFA000', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
    transcriptText: { color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: '600', fontStyle: 'italic' },
    aiResultDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 },
    resultScroll: { flexGrow: 0 },
    aiHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    aiHeaderLabel: { color: '#FFA000', fontSize: 14, fontWeight: 'bold' },
    
    voiceCloseBtn: { position: 'absolute', bottom: 50, alignItems: 'center' },
    closeBtnContent: { alignItems: 'center', gap: 8 },
    closeBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' }
});