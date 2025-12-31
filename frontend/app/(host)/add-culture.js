import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors } from '../../constants/theme';

export default function AddCultureScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        price: '',
        location: '',
    });

    const handleSave = async () => {
        if (!formData.title || !formData.price || !formData.description) {
            Alert.alert("Error", "Please fill in Title, Price, and Description.");
            return;
        }

        try {
            setLoading(true);
            const dataToSend = {
                ...formData,
                hostId: user.uid, 
                images: [] 
            };
            
            // Correct Endpoint
            await api.post('/experiences/add', dataToSend);
            
            Alert.alert("Success", "Experience added successfully!");
            router.back(); 
        } catch (error) {
            console.error(error);
            const errorMessage = error.response?.data?.error || "Could not save data";
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Add New Experience</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput 
                style={styles.input} 
                placeholder="e.g. Traditional Cooking"
                value={formData.title} 
                onChangeText={(text) => setFormData({...formData, title: text})} 
            />

            <Text style={styles.label}>Category *</Text>
            <TextInput 
                style={styles.input} 
                placeholder="e.g. Cooking"
                value={formData.category} 
                onChangeText={(text) => setFormData({...formData, category: text})} 
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Details about the event..."
                multiline={true}
                numberOfLines={4}
                value={formData.description} 
                onChangeText={(text) => setFormData({...formData, description: text})} 
            />

            <Text style={styles.label}>Price (LKR) *</Text>
            <TextInput 
                style={styles.input} 
                keyboardType="numeric"
                placeholder="e.g. 2500"
                value={formData.price} 
                onChangeText={(text) => setFormData({...formData, price: text})} 
            />

            <TouchableOpacity 
                style={[styles.saveBtn, loading && styles.disabledBtn]} 
                onPress={handleSave}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Experience</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 40, color: Colors.primary },
    label: { fontWeight: 'bold', marginBottom: 5, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
    saveBtn: { backgroundColor: Colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 50 },
    disabledBtn: { backgroundColor: '#ccc' },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});