import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, 
    ActivityIndicator, Alert, Dimensions, Modal, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

/**
 * ExperienceDetailScreen: Provides a deep-dive view into a specific cultural experience.
 * Features: Multimedia display, AI-powered Voice Assistant (RAG), and Booking Management.
 */
export default function ExperienceDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user, userProfile } = useAuth();
    
    // --- Data Persistence States ---
    const [exp, setExp] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- AI Assistant (Voice & Text) States ---
    const [recording, setRecording] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiVisible, setAiVisible] = useState(false);
    const [aiText, setAiText] = useState("");
    const [heardText, setHeardText] = useState("");

    // --- Transactional (Booking) States ---
    const [isModalVisible, setModalVisible] = useState(false);
    const [guestCount, setGuestCount] = useState(1);
    const [isBooking, setIsBooking] = useState(false);

    // Initial Load: Fetch data and setup resource cleanup
    useEffect(() => {
        fetchDetails();
        return () => {
            Speech.stop(); // Ensures AI stops talking when user navigates away
        };
    }, [id]);

    /**
     * Retrieves specific cultural experience details from the MongoDB backend.
     */
    const fetchDetails = async () => {
        try {
            const res = await api.get(`/experiences/${id}`);
            setExp(res.data);
        } catch (e) {
            Alert.alert("Connection Error", "Could not load experience details.");
            goToCultureHub();
        } finally {
            setLoading(false);
        }
    };

    /**
     * Forced Navigation Fix: Ensures the back button always returns to the Culture Hub
     * and stops any ongoing AI audio playback.
     */
    const goToCultureHub = () => {
        Speech.stop(); 
        router.replace('/(tourist)/culture');
    };

    // --- AI Voice Logic: Speech-to-Text & Contextual Knowledge Retrieval ---

    /**
     * Initializes the device microphone and starts high-quality audio recording.
     */
    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "Microphone access is required for the AI assistant.");
                return;
            }
            
            setAiVisible(false);
            Speech.stop(); 

            // Configure audio mode for high-quality capture
            await Audio.setAudioModeAsync({ 
                allowsRecordingIOS: true, 
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            const record = new Audio.Recording();
            await record.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await record.startAsync();
            setRecording(record);
            setIsListening(true);
        } catch (err) { 
            console.error("Mic Initialization Error:", err); 
        }
    };

    /**
     * Stops the audio recording and extracts the URI for backend processing.
     */
    const stopRecording = async () => {
        if (!recording) return;
        setIsListening(false);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            handleVoiceQuery(uri);
        } catch (err) { 
            console.error("Recording Finalization Error:", err); 
        }
    };

    /**
     * Sends the audio file to the AI backend for Whisper transcription and RAG Llama generation.
     */
    const handleVoiceQuery = async (uri) => {
        setIsAiProcessing(true);
        try {
            const formData = new FormData();
            
            // Critical Formatting: Standardized URI handling for Android and iOS
            const cleanUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

            formData.append('audio', { 
                uri: cleanUri, 
                type: 'audio/m4a', 
                name: 'speech.m4a' 
            });

            const response = await api.post('/ai/cultural-assistant-voice', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000 // Extended timeout for AI processing
            });

            const { answer, recognizedText } = response.data;
            
            setHeardText(recognizedText);
            setAiText(answer);
            setAiVisible(true);
            
            // Text-to-Speech playback of AI response
            Speech.speak(answer, { rate: 0.9, language: 'en' });
        } catch (error) { 
            console.log("AI Backend Error:", error.message);
            Alert.alert("Assistant Unavailable", "The AI service is currently busy. Please try again."); 
        } finally { 
            setIsAiProcessing(false); 
        }
    };

    // --- Booking Logic: Payload Construction & Submission ---

    /**
     * Submits the booking request and redirects the user to the status tracking screen.
     */
    const handleConfirmBooking = async () => {
        if (!user) {
            Alert.alert("Login Required", "Please sign in to book this experience.");
            return;
        }
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
            
            Alert.alert(
                "Request Sent! 🙏", 
                "Your booking is pending host approval.",
                [{ text: "View Bookings", onPress: () => router.replace('/(tourist)/my-bookings') }]
            );
            setModalVisible(false);
        } catch (error) { 
            Alert.alert("Booking Failed", "We couldn't process your request. Check your connection."); 
        } finally { 
            setIsBooking(false); 
        }
    };

    if (loading) return <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />;

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* --- HERO IMAGE HEADER --- */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: exp?.images?.[0] }} style={styles.mainImg} />
                    <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topGradient} />
                    
                    <TouchableOpacity style={styles.backBtn} onPress={goToCultureHub}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* --- MAIN CONTENT CARD --- */}
                <View style={styles.infoCard}>
                    <View style={styles.catRow}>
                        <View style={styles.catBadge}>
                            <Text style={styles.catLabel}>{exp?.category}</Text>
                        </View>
                        <View style={styles.ratingBox}>
                            <Ionicons name="star" size={16} color="#FFA000" />
                            <Text style={styles.ratingText}>{exp?.rating || "5.0"}</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{exp?.title}</Text>
                    <View style={styles.divider} />
                    
                    <Text style={styles.sectionHeader}>Cultural Insight</Text>
                    <Text style={styles.desc}>{exp?.description}</Text>
                </View>
            </ScrollView>

            {/* --- FLOATING AI ASSISTANT FEEDBACK --- */}
            {aiVisible && (
                <View style={styles.aiBubble}>
                    <View style={styles.aiHeader}>
                        <View style={styles.heardContainer}>
                            <Ionicons name="mic-outline" size={14} color={Colors.primary} />
                            <Text style={styles.heardLabel} numberOfLines={1}>{`"${heardText}"`}</Text>
                        </View>
                        <TouchableOpacity onPress={() => {setAiVisible(false); Speech.stop();}}>
                            <Ionicons name="close-circle" size={26} color="#D32F2F" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{maxHeight: 220}} showsVerticalScrollIndicator={false}>
                        <Markdown style={markdownStyles}>{aiText}</Markdown>
                    </ScrollView>
                </View>
            )}

            {/* --- INTERACTION FOOTER --- */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.micBtn, isListening && styles.micActive]} 
                    onPressIn={startRecording} 
                    onPressOut={stopRecording}
                >
                    {isAiProcessing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Ionicons name={isListening ? "mic-off" : "mic"} size={32} color="white" />
                    )}
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.bookBtn} onPress={() => setModalVisible(true)}>
                    <Text style={styles.bookText}>Book for LKR {exp?.price?.toLocaleString()}</Text>
                </TouchableOpacity>
            </View>

            {/* --- PARTICIPANT SELECTION MODAL --- */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalDragHandle} />
                        <Text style={styles.modalTitle}>Confirm Booking</Text>
                        <Text style={styles.modalSub}>{exp?.title}</Text>

                        <Text style={styles.guestLabel}>Select Number of Travelers</Text>
                        <View style={styles.countRow}>
                            <TouchableOpacity onPress={() => setGuestCount(Math.max(1, guestCount-1))}>
                                <Ionicons name="remove-circle-outline" size={50} color={Colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.countText}>{guestCount}</Text>
                            <TouchableOpacity onPress={() => setGuestCount(guestCount+1)}>
                                <Ionicons name="add-circle-outline" size={50} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Grand Total</Text>
                            <Text style={styles.totalPrice}>LKR {(exp?.price * guestCount).toLocaleString()}</Text>
                        </View>

                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmBooking} disabled={isBooking}>
                            {isBooking ? <ActivityIndicator color="white" /> : <Text style={styles.confirmText}>Request Booking Now</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelLink}>
                            <Text style={styles.cancelLinkText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- STYLING: Markdown AI Output ---
const markdownStyles = {
    body: { color: '#333', fontSize: 15, lineHeight: 22 },
    strong: { fontWeight: 'bold', color: '#2E7D32' }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Hero Header Styles
    imageContainer: { width: width, height: 380, position: 'relative' },
    mainImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    topGradient: { position: 'absolute', top: 0, width: '100%', height: 120 },
    backBtn: { position: 'absolute', top: 50, left: 20, width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    
    // Info Card Styling
    infoCard: { padding: 25, marginTop: -35, backgroundColor: '#FFFFFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, minHeight: 450, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    catBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    catLabel: { color: '#2E7D32', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' },
    ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    ratingText: { fontWeight: 'bold', color: '#444' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15 },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12, marginTop: 10 },
    desc: { fontSize: 15, color: '#616161', lineHeight: 24, marginBottom: 120 },
    
    // Bottom Interaction Bar
    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', gap: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingBottom: 40, alignItems: 'center' },
    micBtn: { width: 65, height: 65, borderRadius: 33, backgroundColor: '#FFA000', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#FFA000', shadowOpacity: 0.3, shadowRadius: 8 },
    micActive: { backgroundColor: '#FF5252', transform: [{ scale: 1.1 }] },
    bookBtn: { flex: 1, backgroundColor: Colors.primary, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    bookText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

    // AI Display Styles
    aiBubble: { position: 'absolute', bottom: 130, left: 20, right: 20, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 25, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, borderBottomRightRadius: 5 },
    aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10, marginBottom: 12 },
    heardContainer: { flexDirection: 'row', alignItems: 'center', flex: 0.85, gap: 5, backgroundColor: '#F8F9FA', padding: 8, borderRadius: 12 },
    heardLabel: { fontStyle: 'italic', color: '#888', fontSize: 13 },
    
    // Modal & Counter Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', padding: 30, borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingBottom: 50 },
    modalDragHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1A1A1A' },
    modalSub: { textAlign: 'center', color: '#666', marginBottom: 30, marginTop: 5 },
    guestLabel: { fontSize: 16, fontWeight: '600', color: '#444', marginBottom: 20, textAlign: 'center' },
    countRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40, marginBottom: 35 },
    countText: { fontSize: 36, fontWeight: 'bold', color: '#1A1A1A', width: 40, textAlign: 'center' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, backgroundColor: '#F9F9F9', padding: 20, borderRadius: 18, alignItems: 'center' },
    totalLabel: { fontSize: 16, color: '#666', fontWeight: '500' },
    totalPrice: { fontWeight: 'bold', color: Colors.primary, fontSize: 22 },
    confirmBtn: { backgroundColor: Colors.primary, padding: 20, borderRadius: 18, elevation: 2 },
    confirmText: { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold', fontSize: 18 },
    cancelLink: { marginTop: 20, padding: 10 },
    cancelLinkText: { color: '#FF5252', textAlign: 'center', fontWeight: 'bold', fontSize: 15 }
});