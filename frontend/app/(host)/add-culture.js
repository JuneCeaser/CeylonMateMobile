import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    Alert, 
    ActivityIndicator 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Dropdown } from 'react-native-element-dropdown'; // Import Dropdown component
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function AddCultureScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { editId } = useLocalSearchParams(); 
    
    const [loading, setLoading] = useState(false);
    const [isFocus, setIsFocus] = useState(false); // State for dropdown focus styling

    // Category options matching the Tourist filter
    const categories = [
        { label: 'Cooking', value: 'Cooking' },
        { label: 'Farming', value: 'Farming' },
        { label: 'Handicraft', value: 'Handicraft' },
        { label: 'Fishing', value: 'Fishing' },
        { label: 'Dancing', value: 'Dancing' },
    ];

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        price: '',
        location: '',
    });

    // Fetch existing details if in Edit Mode
    useEffect(() => {
        if (editId) {
            fetchExperienceDetails();
        }
    }, [editId]);

    const fetchExperienceDetails = async () => {
        try {
            const response = await api.get(`/experiences/${editId}`);
            const data = response.data;
            setFormData({
                title: data.title,
                category: data.category,
                description: data.description,
                price: data.price.toString(),
                location: data.location || '',
            });
        } catch (error) {
            Alert.alert("Error", "Could not fetch experience details");
        }
    };

    /**
     * handleSave: Handles both creation and update logic
     */
    const handleSave = async () => {
        if (!formData.title || !formData.category || !formData.price || !formData.description) {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }

        try {
            setLoading(true);
            const dataToSend = {
                ...formData,
                price: Number(formData.price), 
                host: user.uid, 
                images: [], 
                rating: 5.0, 
            };
            
            if (editId) {
                await api.put(`/experiences/update/${editId}`, dataToSend);
                Alert.alert("Success", "Experience updated successfully!");
            } else {
                await api.post('/experiences/add', dataToSend);
                Alert.alert("Success", "Experience added successfully!");
            }
            router.back(); 
        } catch (error) {
            const errorMessage = error.response?.data?.error || "Could not save data";
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header with Green Gradient */}
            <LinearGradient colors={[Colors.primary, '#1B5E20']} style={styles.header}>
                <Text style={styles.headerTitle}>{editId ? "Edit Tradition" : "Host a Tradition"}</Text>
                <Text style={styles.headerSubtitle}>Showcase Sri Lankan culture to the world 🇱🇰</Text>
            </LinearGradient>

            <ScrollView 
                style={styles.content} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    {/* Title Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Experience Title *</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. Traditional Cooking"
                            value={formData.title} 
                            onChangeText={(text) => setFormData({...formData, title: text})} 
                        />
                    </View>

                    {/* Category Dropdown */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category *</Text>
                        <Dropdown
                            style={[styles.dropdown, isFocus && { borderColor: Colors.primary }]}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            data={categories}
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder={!isFocus ? 'Select Category' : '...'}
                            value={formData.category}
                            onFocus={() => setIsFocus(true)}
                            onBlur={() => setIsFocus(false)}
                            onChange={item => {
                                setFormData({...formData, category: item.value});
                                setIsFocus(false);
                            }}
                            renderLeftIcon={() => (
                                <Ionicons
                                    style={styles.icon}
                                    color={isFocus ? Colors.primary : Colors.textSecondary}
                                    name="grid-outline"
                                    size={20}
                                />
                            )}
                        />
                    </View>

                    {/* Description Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="Details about the cultural significance..."
                            multiline={true}
                            numberOfLines={4}
                            value={formData.description} 
                            onChangeText={(text) => setFormData({...formData, description: text})} 
                        />
                    </View>

                    {/* Price Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Price (LKR) *</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric"
                            placeholder="e.g. 2500"
                            value={formData.price} 
                            onChangeText={(text) => setFormData({...formData, price: text})} 
                        />
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity 
                    style={styles.generateButton} 
                    onPress={handleSave}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={[Colors.primary, Colors.success]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.generateButtonGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.surface} />
                        ) : (
                            <>
                                <Ionicons name="sparkles" size={24} color={Colors.surface} />
                                <Text style={styles.generateButtonText}>
                                    {editId ? "Update Experience" : "Publish Experience"}
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        paddingTop: 60,
        paddingBottom: 25,
        paddingHorizontal: Spacing.lg,
    },
    headerTitle: { ...Typography.h1, color: Colors.surface },
    headerSubtitle: { ...Typography.body, color: Colors.surface, opacity: 0.9, fontSize: 14 },
    content: { flex: 1 },
    scrollContent: { padding: Spacing.lg, paddingBottom: 50 },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    inputGroup: { marginBottom: Spacing.md },
    label: { ...Typography.body, fontWeight: '600', marginBottom: Spacing.xs, color: Colors.text },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: 16,
        backgroundColor: Colors.background,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    dropdown: {
        height: 55,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        paddingHorizontal: 8,
        backgroundColor: Colors.background,
    },
    icon: { marginRight: 5 },
    placeholderStyle: { fontSize: 16, color: Colors.textSecondary },
    selectedTextStyle: { fontSize: 16, color: Colors.text },
    generateButton: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
    generateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    generateButtonText: { color: Colors.surface, fontSize: 18, fontWeight: 'bold' },
});