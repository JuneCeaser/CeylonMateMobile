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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import api from '../../constants/api';

export default function CultureScreen() {
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
            console.error("Error fetching cultural data:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderExperienceCard = ({ item }) => (
        <TouchableOpacity 
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => console.log("Experience ID:", item._id)}
        >
            <Image 
                source={{ 
                    uri: item.images && item.images.length > 0 
                        ? item.images[0] 
                        : 'https://via.placeholder.com/400x250?text=CeylonMate+Culture' 
                }} 
                style={styles.cardImage} 
            />
            
            <View style={styles.priceTag}>
                <Text style={styles.priceText}>LKR {item.price}</Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.categoryRow}>
                    <Text style={styles.categoryLabel}>{item.category}</Text>
                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color={Colors.warning} />
                        <Text style={styles.ratingValue}>{item.rating || '5.0'}</Text>
                    </View>
                </View>

                <Text style={styles.experienceTitle}>{item.title}</Text>
                <Text style={styles.experienceDesc} numberOfLines={2}>{item.description}</Text>

                <View style={styles.cardFooter}>
                    <View style={styles.hostInfo}>
                        <View style={styles.hostAvatar}>
                            <Ionicons name="person" size={12} color={Colors.primary} />
                        </View>
                        <Text style={styles.hostLabel}>Local Host</Text>
                    </View>
                    <TouchableOpacity style={styles.exploreBtn}>
                        <Text style={styles.exploreBtnText}>Explore</Text>
                        <Ionicons name="arrow-forward" size={14} color={Colors.surface} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Square-bottomed Green Gradient Header */}
            <LinearGradient
                colors={[Colors.primary, '#1B5E20']} // Richer green gradient
                style={styles.header}
            >
                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.headerTitle}>Culture Hub</Text>
                        <Text style={styles.headerSubtitle}>
                            Discover authentic Sri Lankan traditions 🇱🇰
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.notificationBtn}>
                        <Ionicons name="notifications-outline" size={26} color={Colors.surface} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={Colors.textSecondary} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Find 'Cooking','Dancing'..."
                        placeholderTextColor={Colors.textSecondary}
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
                            <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
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
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        paddingTop: 60,
        paddingBottom: 25,
        paddingHorizontal: Spacing.lg,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    headerTitle: { ...Typography.h1, color: Colors.surface },
    headerSubtitle: { ...Typography.body, color: Colors.surface, opacity: 0.9, fontSize: 14 },
    notificationBtn: {
        padding: 5,
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        backgroundColor: Colors.secondary,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    searchBox: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        alignItems: 'center',
        elevation: 5,
    },
    searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: 16, color: Colors.text },
    filterSection: { marginVertical: Spacing.md },
    chipScroll: { paddingHorizontal: Spacing.lg },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: BorderRadius.round,
        backgroundColor: Colors.surface,
        marginRight: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    activeChip: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { color: Colors.text, fontWeight: '600' },
    activeChipText: { color: Colors.surface },
    listContainer: { paddingHorizontal: Spacing.lg, paddingBottom: 30 },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.lg,
        overflow: 'hidden',
        elevation: 4,
    },
    cardImage: { width: '100%', height: 200 },
    priceTag: {
        position: 'absolute',
        top: 15,
        right: 0,
        backgroundColor: Colors.secondary,
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderTopLeftRadius: BorderRadius.md,
        borderBottomLeftRadius: BorderRadius.md,
    },
    priceText: { color: Colors.surface, fontWeight: 'bold', fontSize: 14 },
    cardBody: { padding: Spacing.md },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
    categoryLabel: { color: Colors.primary, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    ratingValue: { fontSize: 12, fontWeight: 'bold', color: Colors.text },
    experienceTitle: { ...Typography.h3, color: Colors.text, marginBottom: 5 },
    experienceDesc: { ...Typography.caption, lineHeight: 20, marginBottom: Spacing.md },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.background,
        paddingTop: Spacing.sm,
    },
    hostInfo: { flexDirection: 'row', alignItems: 'center' },
    hostAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    hostLabel: { fontSize: 13, color: Colors.textSecondary },
    exploreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: BorderRadius.md,
        gap: 5,
    },
    exploreBtnText: { color: Colors.surface, fontWeight: 'bold', fontSize: 14 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
});