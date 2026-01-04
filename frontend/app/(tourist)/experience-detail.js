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
import { Calendar } from 'react-native-calendars'; 
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';

const { width, height } = Dimensions.get('window');

/**
 * ExperienceDetailScreen: Displays detailed information about a cultural experience.
 */
export default function ExperienceDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user, userProfile } = useAuth();
    const recordingRef = useRef(null);
    
    // States
    const [exp, setExp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [wishlisted, setWishlisted] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiVisible, setAiVisible] = useState(false);
    const [aiText, setAiText] = useState("");
    const [recognizedQuestion, setRecognizedQuestion] = useState("");
    const [isModalVisible, setModalVisible] = useState(false);
    const [guestCount, setGuestCount] = useState(1);
    const [selectedDate, setSelectedDate] = useState(''); 
    const [selectedTime, setSelectedTime] = useState(new Date()); 
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [disabledDates, setDisabledDates] = useState({}); 
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

    useEffect(() => {
        if (exp?.host) {
            fetchHostAvailability();
        }
    }, [exp]);

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

    const fetchHostAvailability = async () => {
        try {
            const res = await api.get(`/bookings/host-availability/${exp.host}`);
            let marked = {};
            res.data.forEach(booking => {
                const dateKey = booking.bookingDate.split('T')[0];
                marked[dateKey] = { 
                    disabled: true, 
                    disableTouchEvent: true, 
                    marked: true, 
                    dotColor: '#D32F2F' 
                };
            });
            setDisabledDates(marked);
        } catch (e) {
            console.error("Availability error:", e);
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
        router.push({ pathname: '/vr-viewer', params: { videoUrl: exp?.vrVideoUrl } });
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
        setIsAiProcessing(true);    // Switch to processing state on the overlay{}
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
                setAiVisible(true);
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
        if (!selectedDate) { Alert.alert("Date Required", "Please select a date."); return; }
        setIsBooking(true);
        try {
            const finalBookingDate = new Date(selectedDate);
            finalBookingDate.setHours(selectedTime.getHours());
            finalBookingDate.setMinutes(selectedTime.getMinutes());
            const bookingData = {
                experience: exp._id,
                tourist: user.uid,
                touristName: userProfile?.name || "Traveler",
                host: exp.host,
                hostName: exp.hostName || "Host",
                bookingDate: finalBookingDate,
                guests: guestCount,
                totalPrice: exp.price * guestCount
            };
            await api.post('/bookings/add', bookingData);
            setModalVisible(false);
            Alert.alert("Success!", "Booking request sent to host.", [
                { text: "OK", onPress: () => router.replace('/(tourist)/my-bookings') }
            ]);
        } catch (e) { 
            Alert.alert("Error", e.response?.data?.error || "Booking failed."); 
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
                            <TouchableOpacity onPress={() => router.replace('/(tourist)/culture')} style={styles.backBtn}activeOpacity={0.7}>
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

                {/* Content */}
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

                    {/* AI Voice Assistant */}
                    <View style={styles.aiSectionContainer}>
                        <Text style={styles.subHeading}>Cultural AI Voice Assistant</Text>
                        <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.aiCard}>
                            <View style={styles.aiCardContent}>
                                <View style={styles.aiTextPart}>
                                    <Text style={styles.aiCardTitle}>Ask CeylonMate</Text>
                                    <Text style={styles.aiCardDesc}>Hold the button and ask about history or traditions.</Text>
                                </View>
                                <TouchableOpacity style={[styles.aiMicBtn, isListening && styles.aiMicBtnActive]} onPressIn={startRecording} onPressOut={stopRecording}>
                                    <Ionicons name={isListening ? "mic" : "mic-outline"} size={32} color="white" />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
                </View>
            </ScrollView>

            {/* AI Modal */}
            <Modal visible={isListening || isAiProcessing || aiVisible} transparent animationType="fade">
                <View style={styles.voiceOverlay}>
                    <LinearGradient colors={['rgba(0,0,0,0.95)', 'rgba(20,60,30,0.98)']} style={styles.voiceOverlayGradient}>
                        <View style={styles.voiceCenterContent}>
                            {isListening ? (
                                <>
                                    <View style={styles.pulseContainer}><View style={styles.pulseCircle} /><View style={styles.micCircleActive}><Ionicons name="mic" size={60} color="white" /></View></View>
                                    <Text style={styles.voiceStatusText}>Listening...</Text>
                                    <Text style={styles.voiceSubText}>Ask about Sri Lankan culture</Text>
                                </>
                            ) : isAiProcessing ? (
                                <>
                                    <ActivityIndicator size="large" color="#FFA000" style={{ marginBottom: 20 }} />
                                    <Text style={styles.voiceStatusText}>Processing...</Text>
                                </>
                            ) : (
                                <View style={styles.fullScreenResult}>
                                    <View style={styles.transcriptSection}>
                                        <Text style={styles.transcriptLabel}>You asked:</Text>
                                        <Text style={styles.transcriptText}>{recognizedQuestion ? `"${recognizedQuestion}"` : "Analyzing voice..."}</Text>
                                    </View>
                                    <View style={styles.aiResultDivider} />
                                    <ScrollView style={styles.resultScroll}>
                                        <View style={styles.aiHeaderRow}>
                                            <MaterialCommunityIcons name="robot-happy" size={24} color="#FFA000" />
                                            <Text style={styles.aiHeaderLabel}>CeylonMate Guide</Text>
                                        </View>
                                        <Markdown style={fullMarkdownStyles}>{aiText}</Markdown>
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity style={styles.voiceCloseBtn} onPress={closeAssistantOverlay}><Ionicons name="close-circle" size={50} color="rgba(255,255,255,0.7)" /></TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>

            {/* STICKY FOOTER - BEAUTIFIED */}
            <View style={styles.footerSticky}>
                <TouchableOpacity style={styles.bookActionBtnFull} onPress={() => setModalVisible(true)}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.footerPriceText}>LKR {exp?.price?.toLocaleString()}</Text>
                        <Text style={styles.footerSubText}>Per person</Text>
                    </View>
                    <View style={styles.footerSeparator} />
                    <View style={styles.bookNowContainer}>
                        <Text style={styles.bookNowText}>Book Experience</Text>
                        <Ionicons name="chevron-forward" size={18} color="white" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Booking Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <View style={styles.mHandle} />
                        <View style={styles.mHeaderRow}>
                            <Text style={styles.mHeader}>Schedule Experience</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={28} color="#CCC" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={styles.bookingCard}>
                                <View style={styles.cardHeader}><Ionicons name="calendar" size={18} color="#2E7D32" /><Text style={styles.cardTitle}>Select Date</Text></View>
                                <Calendar minDate={new Date().toISOString().split('T')[0]} markedDates={{...disabledDates, [selectedDate]: { selected: true, selectedColor: '#2E7D32', selectedTextColor: 'white' }}} onDayPress={day => setSelectedDate(day.dateString)} theme={{todayTextColor: '#2E7D32', arrowColor: '#2E7D32', selectedDayBackgroundColor: '#2E7D32'}} style={styles.calendarStyle} />
                            </View>
                            <View style={styles.inputGrid}>
                                <View style={[styles.bookingCard, { flex: 1, marginRight: 8 }]}><View style={styles.cardHeader}><Ionicons name="time" size={18} color="#2E7D32" /><Text style={styles.cardTitle}>Time</Text></View><TouchableOpacity style={styles.timeSelector} onPress={() => setShowTimePicker(true)}><Text style={styles.timeVal}>{selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></TouchableOpacity></View>
                                <View style={[styles.bookingCard, { flex: 1, marginLeft: 8 }]}><View style={styles.cardHeader}><Ionicons name="people" size={18} color="#2E7D32" /><Text style={styles.cardTitle}>Guests</Text></View><View style={styles.guestCounter}><TouchableOpacity onPress={() => setGuestCount(Math.max(1, guestCount-1))}><Ionicons name="remove-circle-outline" size={24} color="#666" /></TouchableOpacity><Text style={styles.guestCountText}>{guestCount}</Text><TouchableOpacity onPress={() => setGuestCount(guestCount+1)}><Ionicons name="add-circle-outline" size={24} color="#2E7D32" /></TouchableOpacity></View></View>
                            </View>
                            {showTimePicker && <DateTimePicker value={selectedTime} mode="time" is24Hour={false} onChange={(e, date) => { setShowTimePicker(false); if (date) setSelectedTime(date); }} />}
                            <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.mSummaryCard}><View><Text style={styles.mTotalLabel}>Grand Total</Text><Text style={styles.mTotalVal}>LKR {(exp?.price * guestCount).toLocaleString()}</Text></View><Ionicons name="receipt" size={30} color="rgba(255,255,255,0.2)" /></LinearGradient>
                            <TouchableOpacity style={[styles.mConfirmBtn, !selectedDate && { backgroundColor: '#EEE' }]} onPress={handleConfirmBooking} disabled={isBooking || !selectedDate}>{isBooking ? <ActivityIndicator color="white" /> : <Text style={styles.mConfirmText}>Confirm & Request</Text>}</TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const fullMarkdownStyles = { body: { color: 'white', fontSize: 16, lineHeight: 24 }, strong: { color: '#FFA000', fontWeight: 'bold' } };

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    loader: { flex: 1, justifyContent: 'center' },
    heroContainer: { width: width, height: 280 },
    heroImg: { width: '100%', height: '100%' },
    headerGradient: { position: 'absolute', top: 0, width: '100%', height: 100, paddingTop: 40, paddingHorizontal: 15 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    backBtn: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 5 },
    heroOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 15 },
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
    subHeading: { fontSize: 16, fontWeight: '800', color: '#2E7D32', marginBottom: 12 },
    mainDesc: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 20 },
    previewScroll: { marginTop: 5, marginBottom: 20 },
    previewItem: { width: 150, marginRight: 15, alignItems: 'center' },
    previewImage: { width: 150, height: 95, borderRadius: 12 },
    previewIconWrap: { position: 'absolute', top: 25, backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 25 },
    previewLabel: { fontSize: 11, fontWeight: '700', marginTop: 5, color: '#444' },
    aiSectionContainer: { marginTop: 10, marginBottom: 20 },
    aiCard: { borderRadius: 20, padding: 20, elevation: 4 },
    aiCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    aiTextPart: { flex: 1, marginRight: 15 },
    aiCardTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
    aiCardDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 18 },
    aiMicBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFA000', justifyContent: 'center', alignItems: 'center' },
    aiMicBtnActive: { backgroundColor: '#FF5252' },

    // FOOTER STYLING
    footerSticky: { 
        position: 'absolute', 
        bottom: 0, 
        width: width, 
        backgroundColor: 'white', 
        paddingHorizontal: 20, 
        paddingBottom: Platform.OS === 'ios' ? 35 : 20, 
        paddingTop: 15, 
        borderTopWidth: 1, 
        borderTopColor: '#F0F0F0' 
    },
    bookActionBtnFull: { 
        backgroundColor: '#2E7D32', 
        height: 60, 
        borderRadius: 18, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        elevation: 5,
        shadowColor: '#2E7D32',
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    priceContainer: {
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    footerPriceText: { color: 'white', fontSize: 18, fontWeight: '900' },
    footerSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },
    footerSeparator: {
        width: 1,
        height: '60%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 15
    },
    bookNowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    bookNowText: { color: 'white', fontSize: 16, fontWeight: '800' },

    voiceOverlay: { flex: 1 },
    voiceOverlayGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    voiceCenterContent: { width: '90%', alignItems: 'center' },
    pulseContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    micCircleActive: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFA000', justifyContent: 'center', alignItems: 'center' },
    pulseCircle: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255, 160, 0, 0.3)' },
    voiceStatusText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
    voiceSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5, textAlign: 'center' },
    fullScreenResult: { width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, maxHeight: height * 0.6 },
    transcriptSection: { marginBottom: 15 },
    transcriptLabel: { color: '#FFA000', fontSize: 12, fontWeight: 'bold' },
    transcriptText: { color: 'white', fontSize: 18, fontStyle: 'italic' },
    aiResultDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 },
    aiHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    aiHeaderLabel: { color: '#FFA000', fontSize: 14, fontWeight: 'bold' },
    voiceCloseBtn: { position: 'absolute', bottom: 40 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#F8F9FA', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, height: height * 0.88 },
    mHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
    mHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    mHeader: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
    bookingCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 15, marginBottom: 15 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#666' },
    calendarStyle: { borderRadius: 12, paddingBottom: 10 },
    inputGrid: { flexDirection: 'row', marginBottom: 5 },
    timeSelector: { paddingVertical: 10, paddingHorizontal: 5 },
    timeVal: { fontSize: 18, fontWeight: '800', color: '#2E7D32' },
    guestCounter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
    guestCountText: { fontSize: 20, fontWeight: '800', color: '#333' },
    mSummaryCard: { borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    mTotalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
    mTotalVal: { color: '#FFF', fontSize: 22, fontWeight: '900' },
    mConfirmBtn: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 20, alignItems: 'center' },
    mConfirmText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});