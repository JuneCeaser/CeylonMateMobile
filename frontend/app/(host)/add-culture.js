import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    Alert, 
    ActivityIndicator, 
    KeyboardAvoidingView, 
    Platform,
    Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function AddCultureScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { editId } = useLocalSearchParams();
    
    const [loading, setLoading] = useState(false);
    const [isFocus, setIsFocus] = useState(false);
    const [image, setImage] = useState(null); 

    const categories = [
        { label: 'Cooking', value: 'Cooking' },
        { label: 'Farming', value: 'Farming' },
        { label: 'Handicraft', value: 'Handicraft' },
        { label: 'Fishing', value: 'Fishing' },
        { label: 'Dancing', value: 'Dancing' }
    ];

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        price: '',
    });

    useEffect(() => {
        if (editId) {
            const fetchDetails = async () => {
                try {
                    const res = await api.get(`/experiences/${editId}`);
                    setFormData({
                        title: res.data.title,
                        category: res.data.category,
                        description: res.data.description,
                        price: res.data.price.toString(),
                    });
                    if (res.data.images && res.data.images.length > 0) {
                        setImage(res.data.images[0]); 
                    }
                } catch (e) {
                    Alert.alert("Error", "Details fetch failed");
                }
            };
            fetchDetails();
        }
    }, [editId]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "We need camera roll permissions to upload photos.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            // Updated to the new array format to remove the warning
            mediaTypes: ['images'], 
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const uploadImageToCloudinary = async (fileUri) => {
        if (!fileUri || fileUri.startsWith('http')) return fileUri;

        const data = new FormData();
        data.append('file', {
            uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
            type: 'image/jpeg',
            name: 'upload.jpg',
        });
        
        data.append('upload_preset', 'ceylon_mate_preset'); 

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dvradstnd/image/upload', {
                method: 'POST',
                body: data,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            });

            const result = await response.json();
            
            if (result.secure_url) {
                return result.secure_url;
            } else {
                console.error("Cloudinary Error Response:", result);
                return null;
            }
        } catch (error) {
            console.error("Network Error Details:", error);
            throw new Error("Cloudinary connection failed. Check your internet.");
        }
    };

    const handleSave = async () => {
        if (!formData.title || !formData.category || !formData.price || !formData.description) {
            Alert.alert("Error", "Required fields missing");
            return;
        }

        try {
            setLoading(true);
            
            let finalImageUrl = image;
            if (image && !image.startsWith('http')) {
                const cloudUrl = await uploadImageToCloudinary(image);
                if (cloudUrl) {
                    finalImageUrl = cloudUrl;
                } else {
                    throw new Error("Image upload failed. Please try again.");
                }
            }

            const dataToSend = {
                title: formData.title,
                category: formData.category,
                description: formData.description,
                price: Number(formData.price),
                host: user.uid,
                images: finalImageUrl ? [finalImageUrl] : [],
                rating: 5.0 
            };

            if (editId) {
                await api.put(`/experiences/update/${editId}`, dataToSend);
                Alert.alert("Success", "Updated Successfully!");
            } else {
                await api.post('/experiences/add', dataToSend);
                Alert.alert("Success", "Published Successfully!");
            }
            router.back();
        } catch (err) {
            Alert.alert("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
        >
            <LinearGradient colors={[Colors.primary, '#1B5E20']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.surface} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {editId ? "Edit Experience" : "Create New Experience"}
                    </Text>
                    <View style={{ width: 34 }} /> 
                </View>
                {/* Ayubowan removed from here */}
                <Text style={styles.headerSubtitle}>Share your authentic Sri Lankan cultural experience 🇱🇰</Text>
            </LinearGradient>

            <ScrollView 
                style={styles.content} 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Experience Image</Text>
                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.placeholderBox}>
                                <Ionicons name="camera-outline" size={40} color="#999" />
                                <Text style={styles.placeholderText}>Select a Cover Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, {marginTop: 25}]}>Experience Details</Text>

                    <Text style={styles.label}>Experience Title *</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="pencil-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
                        <TextInput 
                            style={styles.input} 
                            placeholder="Pottery Workshop" 
                            placeholderTextColor="#999"
                            value={formData.title} 
                            onChangeText={(t) => setFormData({...formData, title: t})} 
                        />
                    </View>
                    
                    <Text style={styles.label}>Category *</Text>
                    <Dropdown 
                        style={[styles.dropdown, isFocus && { borderColor: Colors.primary }]} 
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        data={categories} 
                        labelField="label" 
                        valueField="value" 
                        placeholder="Select Category"
                        value={formData.category} 
                        onFocus={() => setIsFocus(true)} 
                        onBlur={() => setIsFocus(false)} 
                        onChange={i => { 
                            setFormData({...formData, category: i.value}); 
                            setIsFocus(false); 
                        }}
                        renderLeftIcon={() => (
                            <Ionicons name="grid-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
                        )}
                    />

                    <Text style={styles.label}>Description *</Text>
                    <View style={[styles.inputContainer, styles.textAreaContainer]}>
                        <TextInput 
                            style={styles.textArea} 
                            multiline 
                            numberOfLines={5}
                            placeholder="Share the story and steps of this experience..."
                            placeholderTextColor="#999"
                            value={formData.description} 
                            onChangeText={(t) => setFormData({...formData, description: t})} 
                        />
                    </View>

                    <Text style={styles.label}>Price (LKR) *</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="cash-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric" 
                            placeholder="2500"
                            placeholderTextColor="#999"
                            value={formData.price} 
                            onChangeText={(t) => setFormData({...formData, price: t})} 
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={handleSave} 
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <LinearGradient 
                        colors={[Colors.primary, '#388E3C']} 
                        style={styles.btn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.btnText}>
                                    {editId ? "Update Experience" : "Publish Experience"}
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { color: '#fff', fontSize: 13, marginTop: 8, opacity: 0.9, textAlign: 'center' },
    iconButton: { padding: 5 },
    content: { flex: 1 },
    scrollContent: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 4, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: Colors.primary, paddingLeft: 10 },
    label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 15 },
    imagePicker: { height: 180, backgroundColor: '#F1F3F5', borderRadius: 15, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    placeholderBox: { alignItems: 'center' },
    placeholderText: { color: '#999', marginTop: 5, fontSize: 12 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F3F5', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E9ECEF' },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 12, fontSize: 15, color: Colors.text },
    textAreaContainer: { alignItems: 'flex-start', paddingTop: 12 },
    textArea: { flex: 1, fontSize: 15, color: Colors.text, minHeight: 100, textAlignVertical: 'top' },
    dropdown: { height: 50, backgroundColor: '#F1F3F5', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E9ECEF' },
    placeholderStyle: { fontSize: 15, color: '#999' },
    selectedTextStyle: { fontSize: 15, color: Colors.text },
    btn: { flexDirection: 'row', marginTop: 10, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
});