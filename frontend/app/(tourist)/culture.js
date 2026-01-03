import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
    Image, ActivityIndicator, ScrollView, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../constants/api';

const { width } = Dimensions.get('window');

export default function CultureScreen() {
    const router = useRouter();
    const [experiences, setExperiences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

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
        } catch (error) { 
            console.error("Fetch error:", error);
        } finally { 
            setLoading(false); 
        }
    };

    const renderExperienceCard = ({ item }) => (
        <TouchableOpacity 
            style={styles.ultraCompactCard} 
            activeOpacity={0.9}
            onPress={() => router.push({
                pathname: "/experience-detail",
                params: { id: item._id }
            })}
        >
            {/* Visual Section */}
            <View style={styles.imageBox}>
                <Image 
                    source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }} 
                    style={styles.thumbImage} 
                />
                <View style={styles.miniCategory}>
                    <Text style={styles.miniCategoryText}>{item.category}</Text>
                </View>
            </View>

            {/* Information Section */}
            <View style={styles.textContainer}>
                <View>
                    <View style={styles.topRow}>
                        <Text style={styles.titleMain} numberOfLines={2}>{item.title}</Text>
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={10} color="#FFA000" />
                            <Text style={styles.ratingVal}>{item.rating || '5.0'}</Text>
                        </View>
                    </View>

                    <View style={styles.hostRow}>
                        <Ionicons name="person-circle-outline" size={14} color="#2E7D32" />
                        <Text style={styles.hostNameText} numberOfLines={1}>
                            Hosted by {item.hostName || "Local Guide"}
                        </Text>
                    </View>
                </View>

                {/* Footer Section */}
                <View style={styles.bottomSection}>
                    <View>
                        <Text style={styles.priceHead}>Price per guest</Text>
                        <Text style={styles.priceValText}>LKR {item.price.toLocaleString()}</Text>
                    </View>
                    
                    <View style={styles.insightBtn}>
                        <Text style={styles.insightBtnText}>Explore Insight</Text>
                        <Ionicons name="chevron-forward" size={12} color="#FFF" />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.headerTitle}>Culture Hub</Text>
                        <Text style={styles.headerSubtitle}>Discover authentic Sri Lankan traditions 🇱🇰</Text>
                    </View>
                    <TouchableOpacity style={styles.bookIcon} onPress={() => router.push('/(tourist)/my-bookings')}>
                        <Ionicons name="calendar-outline" size={24} color="#FFF" />
                        {/* NEW: Notification dot to signal updates */}
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={18} color="#666" />
                    <TextInput 
                        style={styles.searchInput} 
                        placeholder="Search experiences..." 
                        placeholderTextColor="#999"
                        value={searchQuery} 
                        onChangeText={setSearchQuery} 
                    />
                </View>
            </LinearGradient>

            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    <TouchableOpacity 
                        style={[styles.chip, !selectedCategory && styles.activeChip]} 
                        onPress={() => setSelectedCategory('')}
                    >
                        <Text style={[styles.chipText, !selectedCategory && styles.activeChipText]}>All</Text>
                    </TouchableOpacity>
                    {categories.map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={[styles.chip, selectedCategory === cat && styles.activeChip]} 
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2E7D32" style={{marginTop: 50}} />
            ) : (
                <FlatList 
                    data={experiences} 
                    keyExtractor={(item) => item._id} 
                    renderItem={renderExperienceCard} 
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9F9' },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    
    // Updated Book Icon with relative positioning
    bookIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10, position: 'relative' },
    
    // NEW: Notification Dot styling
    notificationDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#F57C00',
        borderWidth: 1.5,
        borderColor: '#1B5E20',
    },

    searchWrapper: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, height: 42, alignItems: 'center' },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
    filterSection: { marginVertical: 12 },
    chipScroll: { paddingHorizontal: 20 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FFF', marginRight: 8, borderWidth: 1, borderColor: '#EEE' },
    activeChip: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    chipText: { color: '#666', fontSize: 12, fontWeight: '600' },
    activeChipText: { color: '#FFF' },
    listContainer: { paddingHorizontal: 20, paddingBottom: 30 },
    ultraCompactCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 15, marginBottom: 12, height: 115, elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, overflow: 'hidden' },
    imageBox: { width: 115, height: 115, position: 'relative' },
    thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    miniCategory: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 2 },
    miniCategoryText: { color: '#FFF', fontSize: 8, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' },
    textContainer: { flex: 1, padding: 10, justifyContent: 'space-between' },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titleMain: { fontSize: 14, fontWeight: '700', color: '#222', flex: 1, marginRight: 4, lineHeight: 18 },
    hostRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
    hostNameText: { fontSize: 11, color: '#666', fontWeight: '500', fontStyle: 'italic' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#F0F7F0', paddingHorizontal: 5, borderRadius: 5 },
    ratingVal: { fontSize: 10, fontWeight: 'bold', color: '#2E7D32' },
    bottomSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceHead: { fontSize: 9, color: '#999', marginBottom: -2 },
    priceValText: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32' },
    
    insightBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#2E7D32', 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 10,
        gap: 3,
        minHeight: 28
    },
    insightBtnText: { 
        color: '#FFF', 
        fontSize: 9, 
        fontWeight: '700',
        textTransform: 'capitalize'
    }
});