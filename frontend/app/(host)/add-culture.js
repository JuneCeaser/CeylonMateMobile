import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors } from '../../constants/theme';

export default function AddCultureScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        price: '',
        location: '',
    });

    const handleSave = async () => {
        if (!formData.title || !formData.price) {
            Alert.alert("Error", "Please fill essential fields");
            return;
        }

        try {
            const dataToSend = {
                ...formData,
                hostId: user.uid,
                images: [] // දැනට හිස්ව තබමු
            };
            
            await api.post('/experiences', dataToSend);
            Alert.alert("Success", "Experience added successfully!");
            router.back(); // කලින් තිබුණු Dashboard එකට නැවත යන්න
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not save data");
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.label}>Experience Title</Text>
            <TextInput 
                style={styles.input} 
                value={formData.title} 
                onChangeText={(text) => setFormData({...formData, title: text})} 
            />

            <Text style={styles.label}>Category (e.g. Cooking, Farming)</Text>
            <TextInput 
                style={styles.input} 
                value={formData.category} 
                onChangeText={(text) => setFormData({...formData, category: text})} 
            />

            <Text style={styles.label}>Price (LKR)</Text>
            <TextInput 
                style={styles.input} 
                keyboardType="numeric"
                value={formData.price} 
                onChangeText={(text) => setFormData({...formData, price: text})} 
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Experience</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff', paddingTop: 60 },
    label: { fontWeight: 'bold', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20 },
    saveBtn: { backgroundColor: Colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});