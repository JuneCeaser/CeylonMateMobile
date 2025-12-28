import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TextInput, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator, 
    ScrollView 
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../constants/api'; // Centralized Axios instance with your IP

export default function CultureScreen() {
    const [experiences, setExperiences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Available categories for filtering
    const categories = ['Cooking', 'Farming', 'Handicraft', 'Fishing', 'Dancing'];

    // Fetch data from MongoDB via Node.js backend
    useEffect(() => {
        fetchExperiences();
    }, [searchQuery, selectedCategory]);

    const fetchExperiences = async () => {
        try {
            setLoading(true);
            // Constructing the URL with query parameters for Search and Category
            let url = `/experiences?search=${searchQuery}`;
            if (selectedCategory) url += `&category=${selectedCategory}`;
            
            const response = await api.get(url);
            setExperiences(response.data);
        } catch (error) {
            console.error("Error fetching cultural data:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Component for each Cultural Experience Card
     */
    const renderExperienceCard = ({ item }) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => {
                /* NEXT STEP: Navigate to a detailed screen 
                   where the Voice Assistant can be activated 
                */
                console.log("Selected Experience ID:", item._id);
            }}
        >
            {/* Display the first image or a placeholder */}
            <Image 
                source={{ 
                    uri: item.images && item.images.length > 0 
                        ? item.images[0] 
                        : 'https://via.placeholder.com/300x200?text=CeylonMate+Culture' 
                }} 
                style={styles.image} 
                resizeMode="cover"
            />
            
            <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>{item.title}</Text>
                    <View style={styles.ratingBox}>
                        <Ionicons name="star" size={14} color={Colors.warning} />
                        <Text style={styles.ratingText}>{item.rating || 'N/A'}</Text>
                    </View>
                </View>

                <Text style={styles.categoryBadge}>{item.category}</Text>
                
                <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                </Text>

                <View style={styles.footerRow}>
                    <Text style={styles.price}>LKR {item.price}</Text>
                    <View style={styles.hostSection}>
                        <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.hostName}>{item.host?.name || 'Local Guide'}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header with Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textSecondary} />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search traditional arts & crafts..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Horizontal Filter for Categories */}
            <View style={styles.categoryBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity 
                        style={[styles.chip, !selectedCategory && styles.activeChip]}
                        onPress={() => setSelectedCategory('')}
                    >
                        <Text style={!selectedCategory ? styles.activeChipText : styles.chipText}>All</Text>
                    </TouchableOpacity>
                    
                    {categories.map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={[styles.chip, selectedCategory === cat && styles.activeChip]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={selectedCategory === cat ? styles.activeChipText : styles.chipText}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Data Display Logic */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Discovering Cultural Experiences...</Text>
                </View>
            ) : (
                <FlatList
                    data={experiences}
                    keyExtractor={(item) => item._id}
                    renderItem={renderExperienceCard}
                    contentContainerStyle={styles.listPadding}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="alert-circle-outline" size={50} color="#ccc" />
                            <Text style={styles.emptyMsg}>No cultural experiences found for this search.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    searchContainer: { 
        flexDirection: 'row', 
        backgroundColor: Colors.surface, 
        marginHorizontal: 15, 
        marginVertical: 10, 
        padding: 12, 
        borderRadius: 12, 
        alignItems: 'center', 
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: Colors.text },
    categoryBar: { paddingLeft: 15, marginBottom: 15 },
    chip: { 
        paddingHorizontal: 18, 
        paddingVertical: 8, 
        borderRadius: 25, 
        marginRight: 10, 
        backgroundColor: '#e0e0e0',
        borderWidth: 1,
        borderColor: '#d0d0d0'
    },
    activeChip: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { color: Colors.text, fontWeight: '500' },
    activeChipText: { color: '#fff', fontWeight: 'bold' },
    listPadding: { paddingHorizontal: 15, paddingBottom: 20 },
    card: { 
        backgroundColor: Colors.surface, 
        borderRadius: 15, 
        marginBottom: 20, 
        overflow: 'hidden', 
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10
    },
    image: { width: '100%', height: 190 },
    cardContent: { padding: 15 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', color: Colors.text, flex: 1 },
    ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
    categoryBadge: { 
        color: Colors.primary, 
        fontSize: 14, 
        fontWeight: '700', 
        marginTop: 5, 
        textTransform: 'uppercase' 
    },
    description: { color: Colors.textSecondary, marginTop: 8, lineHeight: 20 },
    footerRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: 15,
        borderTopWidth: 0.5,
        borderTopColor: '#eee',
        paddingTop: 10
    },
    price: { fontSize: 18, color: Colors.secondary, fontWeight: 'bold' },
    hostSection: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    hostName: { fontSize: 13, color: Colors.textSecondary },
    loadingText: { marginTop: 10, color: Colors.primary, fontWeight: '500' },
    emptyMsg: { marginTop: 10, color: '#999', textAlign: 'center', paddingHorizontal: 40 }
});