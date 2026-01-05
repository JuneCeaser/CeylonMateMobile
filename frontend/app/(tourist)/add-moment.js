import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
    ActivityIndicator, Alert, Dimensions, ScrollView,
    KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location'; 
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function AddMomentScreen() {
    const router = useRouter();
    const { user } = useAuth();
    
    // Form and Logic States
    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isActivity, setIsActivity] = useState(false);
    const [userHint, setUserHint] = useState('');
    const [manualLocation, setManualLocation] = useState('');
    const [cloudUrl, setCloudUrl] = useState('');
    const [currentLocation, setCurrentLocation] = useState('Sri Lanka');

    /**
     * Helper: Reset form states to clear previous data for a fresh start
     */
    const resetForm = () => {
        setImage(null);
        setIsActivity(false);
        setUserHint('');
        setManualLocation('');
        setCloudUrl('');
        setCurrentLocation('Sri Lanka');
    };

    /**
     * Launch Gallery to pick a cultural photo
     */
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Gallery access is required to select photos.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], 
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            // Reset logic states before starting a new AI check
            setIsActivity(false);
            setUserHint('');
            setManualLocation('');
            
            const selectedUri = result.assets[0].uri;
            setImage(selectedUri);
            performSmartCheck(selectedUri);
        }
    };

    /**
     * AI Pre-check: Analyzes the image to decide if it's a Landmark (Auto)
     * or a general Activity (Needs User Input)
     */
    const performSmartCheck = async (uri) => {
        setUploading(true);
        try {
            // Get current device GPS as a base fallback
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let loc = await Location.getCurrentPositionAsync({});
                let address = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude
                });
                if (address.length > 0) {
                    setCurrentLocation(`${address[0].city || address[0].subregion}, Sri Lanka`);
                }
            }

            // Upload image to Cloudinary to provide a URL for the Vision AI
            const data = new FormData();
            data.append('file', { uri, type: 'image/jpeg', name: 'check.jpg' });
            data.append('upload_preset', 'ceylon_mate_preset'); 

            const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dvradstnd/image/upload', {
                method: 'POST',
                body: data,
            });
            const cloudData = await cloudRes.json();
            setCloudUrl(cloudData.secure_url);

            // Ask Backend AI if this is a famous landmark or a custom activity
            const checkRes = await api.post('/moments/pre-check', { imageUrl: cloudData.secure_url });
            
            // If AI identifies as ACTIVITY or has low confidence, show input fields
            if (checkRes.data.data.type === 'ACTIVITY' || checkRes.data.data.confidence < 0.8) {
                setIsActivity(true); 
            } else {
                setIsActivity(false); 
            }
        } catch (error) {
            console.error("Smart check failed:", error);
        } finally {
            setUploading(false);
        }
    };

    /**
     * Final Save: Sends all data (including user hints) to create the AI narrative
     */
    const handlePreserveMoment = async () => {
        if (!cloudUrl) return;

        setUploading(true);
        try {
            const response = await api.post('/moments/add', {
                userId: user?.uid,
                imageUrl: cloudUrl,
                location: currentLocation,
                userDescription: userHint,
                manualLocation: manualLocation 
            });

            if (response.data.success) {
                Alert.alert(
                    "Memory Preserved!",
                    "AI has crafted your cultural story based on the image and your insights.",
                    [{ 
                        text: "View Timeline", 
                        onPress: () => {
                            resetForm(); // Clear inputs before navigating
                            router.replace('/(tourist)/profile');
                        } 
                    }]
                );
            }
        } catch (error) {
            Alert.alert("Error", "Failed to preserve this moment.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#FFF' }}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView 
                    style={styles.container} 
                    contentContainerStyle={styles.center}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Section */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => { resetForm(); router.back(); }}>
                            <Ionicons name="close" size={28} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>AI Moment Preservation</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {/* Image Selection Area */}
                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.placeholder}>
                                <Ionicons name="camera-outline" size={60} color={Colors.textSecondary} />
                                <Text style={styles.placeholderText}>Select a Cultural Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* AI Loading Indicator */}
                    {uploading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.loadingText}>AI is analyzing your photo...</Text>
                        </View>
                    )}

                    {/* Conditional Input UI: Triggered if AI identifies an activity or needs details */}
                    {image && !uploading && isActivity && (
                        <View style={styles.aiInputCard}>
                            <View style={styles.aiTitleRow}>
                                <Ionicons name="sparkles" size={20} color={Colors.primary} />
                                <Text style={styles.aiTitleText}>AI Needs a Little Help!</Text>
                            </View>
                            <Text style={styles.aiDescription}>
                                We identified this as a personal or local activity. Tell us what is happening to create a better story.
                            </Text>
                            
                            <TextInput 
                                style={styles.input}
                                placeholder="What's happening? (e.g., Village cooking class)"
                                value={userHint}
                                onChangeText={setUserHint}
                                placeholderTextColor="#999"
                                returnKeyType="next"
                            />
                            
                            <TextInput 
                                style={styles.input}
                                placeholder="Exact Location? (e.g., Habarana Village)"
                                value={manualLocation}
                                onChangeText={setManualLocation}
                                placeholderTextColor="#999"
                                returnKeyType="done"
                            />
                        </View>
                    )}

                    {/* Save Button: Visible only after image is selected and analyzed */}
                    {!uploading && image && (
                        <TouchableOpacity 
                            style={styles.saveBtn} 
                            onPress={handlePreserveMoment}
                        >
                            <Text style={styles.saveBtnText}>
                                {isActivity ? "Co-Create Story with AI" : "Preserve with AI Vision"}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color="white" />
                        </TouchableOpacity>
                    )}
                    
                    {/* Bottom Padding to ensure button visibility above keyboard */}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { alignItems: 'center', padding: Spacing.lg },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 40, marginBottom: 30 },
    headerTitle: { ...Typography.h3, color: Colors.text },
    imagePicker: { width: width - 40, height: width - 40, backgroundColor: '#F8F9FA', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    placeholder: { alignItems: 'center' },
    placeholderText: { marginTop: 10, color: Colors.textSecondary, fontWeight: '600' },
    loadingContainer: { marginTop: 20, alignItems: 'center' },
    loadingText: { marginTop: 10, color: Colors.primary, fontWeight: '500' },
    aiInputCard: { width: '100%', backgroundColor: Colors.primary + '10', padding: 20, borderRadius: BorderRadius.lg, marginTop: 20 },
    aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    aiTitleText: { fontWeight: 'bold', color: Colors.primary, fontSize: 16 },
    aiDescription: { fontSize: 13, color: Colors.textSecondary, marginBottom: 15, lineHeight: 18 },
    input: { backgroundColor: '#FFF', padding: 15, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 12, color: Colors.text },
    saveBtn: { backgroundColor: Colors.primary, width: '100%', padding: 18, borderRadius: BorderRadius.lg, marginTop: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4, marginBottom: 20 },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});