import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function FactsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 1. Safety Check: Did we receive data?
  let place = null;
  try {
    if (params.placeData) {
      place = JSON.parse(params.placeData);
    }
  } catch (e) {
    console.error("Error parsing place data:", e);
  }

  // 2. If no data, show error screen
  if (!place) {
    return (
      <SafeAreaView style={styles.container}>
         <View style={styles.center}>
            <Text>No Data Found</Text>
            <TouchableOpacity onPress={() => router.back()} style={{marginTop: 20}}>
                <Text style={{color: 'blue'}}>Go Back</Text>
            </TouchableOpacity>
         </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facts & History</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Main Image */}
        <Image 
          source={{ uri: place.images?.[0] || 'https://via.placeholder.com/400' }} 
          style={styles.heroImage} 
        />

        {/* Title */}
        <Text style={styles.title}>{place.name}</Text>
        <Text style={styles.subtitle}>Historical Details</Text>

        {/* 1. KEY FACTS GRID (Dynamic from DB) */}
        <Text style={styles.sectionHeader}>Quick Facts</Text>
        <View style={styles.factsGrid}>
          {place.facts && place.facts.length > 0 ? (
            place.facts.map((fact, index) => (
              <View key={index} style={styles.factCard}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={styles.factValue}>{fact.value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No specific statistics available.</Text>
          )}
        </View>

        {/* 2. FULL HISTORY */}
        <Text style={styles.sectionHeader}>History</Text>
        <View style={styles.historyBox}>
            <Text style={styles.historyText}>
                {place.history || "No historical records available for this location."}
            </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  scrollContent: { padding: 20 },
  heroImage: { width: '100%', height: 200, borderRadius: 20, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 10, color: '#333' },
  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  factCard: { 
    width: '48%', backgroundColor: '#fff', padding: 15, borderRadius: 15, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#FACC15' 
  },
  factLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 5 },
  factValue: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  historyBox: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 2 },
  historyText: { fontSize: 16, lineHeight: 26, color: '#444', textAlign: 'justify' },
  noDataText: { color: '#999', fontStyle: 'italic' }
});