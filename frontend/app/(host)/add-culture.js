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
    Platform 
} from 'react-native';
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
        location: ''
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
                        location: res.data.location || ''
                    });
                } catch (e) {
                    Alert.alert("Error", "Details fetch failed");
                }
            };
            fetchDetails();
        }
    }, [editId]);

    const handleSave = async () => {
    if (!formData.title || !formData.category || !formData.price || !formData.description) {
        Alert.alert("Error", "Required fields missing");
        return;
    }

    try {
        setLoading(true);
        
        // Create a clean data object
        const dataToSend = {
            title: formData.title,
            category: formData.category,
            description: formData.description,
            price: Number(formData.price),
            host: user.uid,
            // Only send location if you actually have coordinates
            // For now, we omit it to avoid the GeoJSON error
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
        Alert.alert("Error", "Update failed: " + err.message);
    } finally {
        setLoading(false);
    }
};

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
        >
            {/* Header with Square Corners */}
            <LinearGradient colors={[Colors.primary, '#1B5E20']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.surface} />
                    </TouchableOpacity>
                    
                    <Text style={styles.headerTitle}>
                        {editId ? "Edit Experience" : "Bring Your Culture to Life"}
                    </Text>
                    
                    <View style={{ width: 34 }} /> 
                </View>
                {/* Centered Subtitle */}
                <Text style={styles.headerSubtitle}>Add a cultural activity and connect travelers with authentic local experiences 🇱🇰</Text>
            </LinearGradient>

            <ScrollView 
                style={styles.content} 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>General Information</Text>

                    <Text style={styles.label}>Experience Title *</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="pencil-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. Traditional Pottery Making" 
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

                    <Text style={styles.label}>Detailed Description *</Text>
                    <View style={[styles.inputContainer, styles.textAreaContainer]}>
                        <TextInput 
                            style={styles.textArea} 
                            multiline 
                            numberOfLines={5}
                            placeholder="Tell tourists about the steps, cultural history, and what they will experience..."
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

                <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                    <Text style={styles.cancelBtnText}>Discard Changes</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { 
        paddingTop: 60, 
        paddingBottom: 30, 
        paddingHorizontal: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { 
        color: '#fff', 
        fontSize: 14, 
        marginTop: 12, 
        opacity: 0.9,
        textAlign: 'center', 
        width: '100%' 
    },
    iconButton: { padding: 5 },
    content: { flex: 1 },
    scrollContent: { padding: 20 },
    card: { 
        backgroundColor: '#fff', 
        borderRadius: BorderRadius.lg, 
        padding: 20, 
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        marginBottom: 20,
        marginTop: 10 
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
        paddingLeft: 10
    },
    label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 15 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F3F5',
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF'
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 12, fontSize: 15, color: Colors.text },
    textAreaContainer: { alignItems: 'flex-start', paddingTop: 12 },
    textArea: { flex: 1, fontSize: 15, color: Colors.text, minHeight: 100, textAlignVertical: 'top' },
    dropdown: { 
        height: 50, 
        backgroundColor: '#F1F3F5', 
        borderRadius: 10, 
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF'
    },
    placeholderStyle: { fontSize: 15, color: '#999' },
    selectedTextStyle: { fontSize: 15, color: Colors.text },
    btn: { 
        flexDirection: 'row',
        marginTop: 10, 
        padding: 16, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center',
        elevation: 3
    },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
    cancelBtn: { marginTop: 20, alignItems: 'center', marginBottom: 40 },
    cancelBtnText: { color: Colors.danger, fontWeight: '600', fontSize: 15 }
});