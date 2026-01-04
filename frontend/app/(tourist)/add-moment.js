import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Image, 
    ActivityIndicator, Alert, Dimensions, ScrollView 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function AddMomentScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    // For Research purposes, we assume the user is adding a moment for a specific experience
    // You can later turn this into a dropdown of visited experiences
    const [experienceName, setExperienceName] = useState("Sigiriya Ancient Rock");

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "We need access to your gallery to upload photos.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handlePreserveMoment = async () => {
        if (!image) {
            Alert.alert("Selection Required", "Please select a cultural photo first.");
            return;
        }

        setUploading(true);
        try {
            // 1. Upload to Cloudinary (Frontend direct upload)
            const data = new FormData();
            data.append('file', { uri: image, type: 'image/jpeg', name: 'moment.jpg' });
            data.append('upload_preset', 'ceylon_mate_preset'); // My Cloudinary Preset 
            data.append('cloud_name', 'dvradstnd'); // My cloudinary cloud name

            const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dvradstnd/image/upload', {
                method: 'POST',
                body: data,
            });
            const cloudData = await cloudRes.json();

            // 2. Call our Backend API (This triggers GROQ AI)
            const response = await api.post('/moments/add', {
                userId: user?.uid,
                experienceName: experienceName,
                imageUrl: cloudData.secure_url,
                location: "Matale, Sri Lanka"
            });

            if (response.data.success) {
                Alert.alert(
                    "Memory Preserved!",
                    "AI has analyzed your photo and added cultural insights.",
                    [{ text: "View Timeline", onPress: () => router.replace('/(tourist)/profile') }]
                );
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Upload Failed", "Something went wrong while processing AI insights.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.center}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Cultural Moment</Text>
                <View style={{ width: 28 }} />
            </View>

            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="camera-outline" size={60} color={Colors.textSecondary} />
                        <Text style={styles.placeholderText}>Select a Heritage Photo</Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={Colors.primary} />
                <Text style={styles.infoText}>
                    Our AI will analyze this photo to generate a storytelling caption and historical facts for you.
                </Text>
            </View>

            <TouchableOpacity 
                style={[styles.saveBtn, uploading && styles.disabledBtn]} 
                onPress={handlePreserveMoment}
                disabled={uploading}
            >
                {uploading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Text style={styles.saveBtnText}>Preserve with AI Insights</Text>
                        <Ionicons name="sparkles" size={18} color="white" />
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    center: { alignItems: 'center', padding: Spacing.lg },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 40, marginBottom: 30 },
    headerTitle: { ...Typography.h3, color: Colors.text },
    imagePicker: { width: width - 60, height: width - 60, backgroundColor: '#F8F9FA', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    placeholder: { alignItems: 'center' },
    placeholderText: { marginTop: 10, color: Colors.textSecondary, fontWeight: '600' },
    infoCard: { flexDirection: 'row', backgroundColor: Colors.primary + '10', padding: 15, borderRadius: BorderRadius.md, marginTop: 20, gap: 10, alignItems: 'center' },
    infoText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 18 },
    saveBtn: { backgroundColor: Colors.primary, width: '100%', padding: 18, borderRadius: BorderRadius.lg, marginTop: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4 },
    disabledBtn: { backgroundColor: Colors.textSecondary },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});