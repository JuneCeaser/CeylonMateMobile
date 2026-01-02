import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
    Image, ActivityIndicator, ScrollView, Modal, Alert 
} from 'react-native';
import { useRouter } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech'; 
import { Audio } from 'expo-av'; 
import Markdown from 'react-native-markdown-display';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext'; 
import api from '../../constants/api';

export default function CultureScreen() {
    const { user, userProfile } = useAuth(); 
    const router = useRouter();
    
    const [experiences, setExperiences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // --- AI Assistant States ---
    const [recording, setRecording] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiBubbleVisible, setAiBubbleVisible] = useState(false);
    const [currentAiText, setCurrentAiText] = useState("");
    const [currentHeardText, setCurrentHeardText] = useState("");

    // --- Booking States ---
    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedExp, setSelectedExp] = useState(null);
    const [guestCount, setGuestCount] = useState(1); // Guest count state
    const [isBooking, setIsBooking] = useState(false);

    const categories = ['Cooking', 'Farming', 'Handicraft', 'Fishing', 'Dancing'];

    useEffect(() => {
        fetchExperiences();
    }, [searchQuery, selectedCategory]);

    const fetchExperiences = async () => {
        try {
            setLoading(true);
            let url = `/experiences?search=${searchQuery}`;
            if (selectedCategory) url += `&category=${selectedCategory}`;
            const response = await api.get(url);
            setExperiences(response.data);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    // --- Voice Logic (Whisper + Llama) ---
    const startRecording = async () => {
        try {
            if (recording) { await recording.stopAndUnloadAsync(); setRecording(null); }
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') return;
            setAiBubbleVisible(false); 
            Speech.stop(); 
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const newRecording = new Audio.Recording();
            await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await newRecording.startAsync();
            setRecording(newRecording);
            setIsListening(true);
        } catch (err) { setRecording(null); setIsListening(false); }
    };

    const stopRecording = async () => {
        if (!recording) return;
        try {
            setIsListening(false);
            const status = await recording.getStatusAsync();
            if (status.isRecording) {
                await recording.stopAndUnloadAsync();
                const uri = recording.getURI(); 
                setRecording(null); 
                handleVoiceQuery(uri);
            }
        } catch (err) { setRecording(null); }
    };

    const handleVoiceQuery = async (uri) => {
        setIsAiProcessing(true);
        try {
            const formData = new FormData();
            formData.append('audio', { uri, type: 'audio/m4a', name: 'speech.m4a' });
            const response = await api.post('/ai/cultural-assistant-voice', formData);
            const { answer, recognizedText } = response.data;
            setCurrentHeardText(recognizedText);
            setCurrentAiText(answer);
            setAiBubbleVisible(true);
            Speech.speak(answer, { language: 'en', rate: 0.9 });
        } catch (error) { Alert.alert("Error", "AI Busy"); } finally { setIsAiProcessing(false); }
    };

    // --- Booking Functions ---
    const openBookingModal = (item) => {
        setSelectedExp(item);
        setGuestCount(1); // Reset guests to 1
        setModalVisible(true);
    };

    const handleConfirmBooking = async () => {
        if (!user) { Alert.alert("Login Required", "Please log in."); return; }
        try {
            setIsBooking(true);
            const bookingData = {
                experience: selectedExp._id,
                tourist: user.uid,
                touristName: userProfile?.name || "Traveler",
                host: selectedExp.host, 
                hostName: selectedExp.hostName || "Host",
                bookingDate: new Date(),
                guests: guestCount,
                totalPrice: selectedExp.price * guestCount
            };
            await api.post('/bookings/add', bookingData);
            Alert.alert("Success! 🙏", "Booking request sent.");
            setModalVisible(false);
        } catch (error) { Alert.alert("Error", "Booking failed."); } finally { setIsBooking(false); }
    };

    const renderExperienceCard = ({ item }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/400x250' }} style={styles.cardImage} />
            <View style={styles.priceTag}><Text style={styles.priceText}>LKR {item.price.toLocaleString()}</Text></View>
            <View style={styles.cardBody}>
                <View style={styles.categoryRow}>
                    <Text style={styles.categoryLabel}>{item.category}</Text>
                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#FFA000" />
                        <Text style={styles.ratingValue}>{item.rating || '5.0'}</Text>
                    </View>
                </View>
                <Text style={styles.experienceTitle}>{item.title}</Text>
                <Text style={styles.experienceDesc} numberOfLines={2}>{item.description}</Text>
                
                <TouchableOpacity style={styles.bookNowBtn} onPress={() => openBookingModal(item)}>
                    <Text style={styles.bookNowText}>Book Now</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.headerTitle}>Culture Hub</Text>
                        <Text style={styles.headerSubtitle}>Discover authentic Sri Lanka 🇱🇰</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(tourist)/my-bookings')}>
                        <Ionicons name="calendar" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#666" />
                    <TextInput style={styles.searchInput} placeholder="Search experiences..." value={searchQuery} onChangeText={setSearchQuery} />
                </View>
            </LinearGradient>

            {/* AI Assistant UI (Floating) */}
            {aiBubbleVisible && (
                <View style={styles.aiOverlay}>
                    <View style={styles.aiCard}>
                        <View style={styles.aiCardHeader}>
                            <View style={styles.heardContainer}>
                                <Ionicons name="mic-outline" size={16} color="#2E7D32" />
                                <Text style={styles.heardText} numberOfLines={1}>{`"${currentHeardText}"`}</Text>
                            </View>
                            <TouchableOpacity onPress={() => {setAiBubbleVisible(false); Speech.stop();}}>
                                <Ionicons name="close-circle" size={28} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.aiScroll}>
                            <Markdown style={markdownStyles}>{currentAiText}</Markdown>
                        </ScrollView>
                    </View>
                </View>
            )}

            <TouchableOpacity 
                style={[styles.floatingMic, isListening && styles.micActive]} 
                onPressIn={startRecording} onPressOut={stopRecording}
            >
                {isAiProcessing ? <ActivityIndicator color="#fff" /> : <Ionicons name={isListening ? "mic-off" : "mic"} size={32} color="#fff" />}
            </TouchableOpacity>

            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {['All', ...categories].map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={[styles.chip, (cat === 'All' ? !selectedCategory : selectedCategory === cat) && styles.activeChip]} 
                            onPress={() => setSelectedCategory(cat === 'All' ? '' : cat)}
                        >
                            <Text style={[styles.chipText, (cat === 'All' ? !selectedCategory : selectedCategory === cat) && styles.activeChipText]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? <ActivityIndicator size="large" color="#2E7D32" style={{marginTop: 50}} /> : (
                <FlatList data={experiences} keyExtractor={(item) => item._id} renderItem={renderExperienceCard} contentContainerStyle={styles.listContainer} />
            )}

            {/* UPDATED MODAL WITH GUEST SELECTOR */}
            <Modal animationType="slide" transparent visible={isModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Finalize Booking</Text>
                        <Text style={styles.modalExpTitle}>{selectedExp?.title}</Text>
                        
                        <Text style={styles.guestLabel}>Number of Guests</Text>
                        <View style={styles.guestPicker}>
                            <TouchableOpacity 
                                onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
                                style={styles.countBtn}
                            >
                                <Ionicons name="remove" size={24} color="#2E7D32" />
                            </TouchableOpacity>
                            <Text style={styles.guestValue}>{guestCount}</Text>
                            <TouchableOpacity 
                                onPress={() => setGuestCount(guestCount + 1)}
                                style={styles.countBtn}
                            >
                                <Ionicons name="add" size={24} color="#2E7D32" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.priceContainer}>
                            <Text style={styles.totalPriceLabel}>Total Price</Text>
                            <Text style={styles.totalPriceValue}>
                                LKR {(selectedExp?.price * guestCount).toLocaleString()}
                            </Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.confirmBookingBtn} 
                            onPress={handleConfirmBooking}
                            disabled={isBooking}
                        >
                            {isBooking ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBookingText}>Confirm Booking</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setModalVisible(false)} style={{marginTop: 20}}>
                            <Text style={{textAlign: 'center', color: '#666', fontWeight: 'bold'}}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const markdownStyles = {
    body: { color: '#333', fontSize: 16, lineHeight: 24 },
    strong: { fontWeight: 'bold', color: '#000' }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
    headerSubtitle: { fontSize: 14, color: '#FFF', opacity: 0.9 },
    searchBox: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 10, alignItems: 'center' },
    searchInput: { flex: 1, marginLeft: 10 },
    listContainer: { paddingHorizontal: 20, paddingBottom: 120 },
    card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20, overflow: 'hidden', elevation: 3 },
    cardImage: { width: '100%', height: 180 },
    priceTag: { position: 'absolute', top: 15, right: 0, backgroundColor: '#FFA000', padding: 8, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
    priceText: { color: '#fff', fontWeight: 'bold' },
    cardBody: { padding: 15 },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    categoryLabel: { color: '#2E7D32', fontWeight: 'bold' },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    ratingValue: { fontSize: 12, color: '#666' },
    experienceTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
    experienceDesc: { fontSize: 14, color: '#666', marginTop: 5, marginBottom: 15 },
    bookNowBtn: { backgroundColor: '#2E7D32', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10, gap: 8 },
    bookNowText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

    // AI Popup
    aiOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, justifyContent: 'flex-end' },
    aiCard: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
    aiCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
    heardContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, flex: 0.85 },
    heardText: { marginLeft: 8, fontSize: 13, color: '#666', fontStyle: 'italic' },
    aiScroll: { marginBottom: 10 },

    floatingMic: { position: 'absolute', bottom: 30, right: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFA000', justifyContent: 'center', alignItems: 'center', elevation: 8, zIndex: 1000 },
    micActive: { backgroundColor: '#FF4757', transform: [{ scale: 1.1 }] },
    filterSection: { marginVertical: 15 },
    chipScroll: { paddingHorizontal: 20 },
    chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
    activeChip: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    activeChipText: { color: '#FFF' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
    modalExpTitle: { textAlign: 'center', marginBottom: 25, color: '#666', fontSize: 16 },
    guestLabel: { fontSize: 16, fontWeight: '600', marginBottom: 15, textAlign: 'center' },
    guestPicker: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 25, marginBottom: 30 },
    countBtn: { width: 45, height: 45, borderRadius: 23, borderWidth: 1, borderColor: '#2E7D32', justifyContent: 'center', alignItems: 'center' },
    guestValue: { fontSize: 24, fontWeight: 'bold', width: 40, textAlign: 'center' },
    priceContainer: { backgroundColor: '#F9F9F9', padding: 20, borderRadius: 15, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalPriceLabel: { fontSize: 14, color: '#666' },
    totalPriceValue: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
    confirmBookingBtn: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 15, elevation: 2 },
    confirmBookingText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }
});