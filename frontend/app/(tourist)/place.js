// ============================================================
// FILE: app/(tourist)/place.js  — UPDATED VERSION
// Added: "Identify Artifact" button that opens the scanner
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator,
  Dimensions, Alert, FlatList, ScrollView, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import ImageView from "react-native-image-viewing";

// ⚠️ Replace with your Laptop's IP Address
const API_URL = 'http://192.168.1.4:5000/api/places';                                                                             

const { width } = Dimensions.get('window');

export default function PlaceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to find nearby places.');
        setLoading(false);
        if (isRefresh) setRefreshing(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      await fetchNearbyPlace(latitude, longitude);
    } catch (error) {
      console.error("Location Error:", error);
      Alert.alert("GPS Error", "Make sure your location is turned on.");
      setLoading(false);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  };

  const fetchNearbyPlace = async (lat, lng) => {
    try {
      const response = await axios.get(`${API_URL}/nearby`, { params: { lat, lng } });
      if (response.data.message) {
        setPlace(null);
      } else {
        setPlace(response.data);
      }
    } catch (error) {
      console.error("API Error:", error);
      Alert.alert("Connection Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    detectLocation(true);
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveImageIndex(Math.round(index));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FACC15" />
        <Text style={{ marginTop: 10, color: '#555' }}>Detecting Location...</Text>
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.center}>
        <Ionicons name="location-outline" size={60} color="#ccc" />
        <Text style={{ marginTop: 10, color: '#555' }}>No historical site detected nearby.</Text>
        <TouchableOpacity onPress={() => detectLocation(false)} style={styles.retryBtn}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry GPS</Text>
        </TouchableOpacity>

        {/* ── ARTIFACT SCANNER — works even without GPS match ── */}
        <TouchableOpacity
          style={styles.scannerBtnAlone}
          onPress={() => router.push('/(tourist)/artifact-scanner')}
        >
          <Ionicons name="scan-outline" size={20} color="#000" />
          <Text style={styles.scannerBtnAloneText}>Scan Artifact Anyway</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#007BFF' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedImages = place.images && place.images.length > 0
    ? place.images.map(img => ({ uri: img }))
    : [{ uri: 'https://via.placeholder.com/400' }];

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>

      <ImageView
        images={formattedImages}
        imageIndex={currentImageIndex}
        visible={visible}
        onRequestClose={() => setVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FACC15']}
            tintColor="#FACC15"
          />
        }
      >

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Auto-Detect</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Image Carousel */}
        <View style={styles.imageCard}>
          <FlatList
            data={place.images && place.images.length > 0 ? place.images : ['https://via.placeholder.com/400']}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity activeOpacity={0.9} onPress={() => { setCurrentImageIndex(index); setVisible(true); }}>
                <Image source={{ uri: item }} style={{ width: width - 40, height: 250 }} resizeMode="cover" />
              </TouchableOpacity>
            )}
          />
          <View style={styles.gpsBadge}>
            <Ionicons name="locate" size={16} color="#000" />
            <Text style={styles.gpsText}>GPS MATCHED</Text>
          </View>
          <View style={styles.paginationContainer}>
            {(place.images || ['placeholder']).map((_, index) => (
              <View key={index} style={[styles.dot, activeImageIndex === index ? styles.activeDot : styles.inactiveDot]} />
            ))}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.placeTitle}>{place.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={16} color="#888" />
            <Text style={styles.locationText}>
              {place.description ? place.description.substring(0, 40) + "..." : "Historical Site"}
            </Text>
          </View>
        </View>

        {/* ── NEW: ARTIFACT SCANNER BANNER ─────────────────── */}
        <TouchableOpacity
          style={styles.scannerBanner}
          onPress={() => router.push('/(tourist)/artifact-scanner')}
          activeOpacity={0.85}
        >
          <View style={styles.scannerBannerLeft}>
            <View style={styles.scannerIconCircle}>
              <Ionicons name="scan-outline" size={26} color="#000" />
            </View>
            <View>
              <Text style={styles.scannerBannerTitle}>Identify Artifact</Text>
              <Text style={styles.scannerBannerSub}>Point camera at any stone artifact</Text>
            </View>
          </View>
          <View style={styles.scannerBannerRight}>
            <Text style={styles.scannerAiTag}>AI</Text>
            <Ionicons name="chevron-forward" size={18} color="#000" />
          </View>
        </TouchableOpacity>
        {/* ────────────────────────────────────────────────── */}

        {/* Grid Buttons */}
        <View style={styles.gridContainer}>

          {/* 1. AR View */}
          <TouchableOpacity style={[styles.card, styles.yellowCard]}>
            <View style={styles.iconCircleBlack}>
              <Ionicons name="scan-outline" size={24} color="#FACC15" />
            </View>
            <Text style={styles.cardTitleBlack}>AR View</Text>
            <Text style={styles.cardSubBlack}>Live Overlay</Text>
          </TouchableOpacity>

          {/* 2. 3D Model Button */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              const nowLink = place.model3DNowUrl;
              const thenLink = place.model3DThenUrl;
              if (nowLink || thenLink) {
                router.push({ pathname: '/3d-model', params: { nowUrl: nowLink, thenUrl: thenLink } });
              } else {
                Alert.alert("Unavailable", "No 3D Model found.");
              }
            }}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="cube-outline" size={24} color="#000" />
            </View>
            <Text style={styles.cardTitle}>3D Model</Text>
            <Text style={styles.cardSub}>Interactive</Text>
          </TouchableOpacity>

          {/* 3. Chatbot Button */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/place-chat', params: { placeId: place._id, placeName: place.name } })}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#000" />
            </View>
            <Text style={styles.cardTitle}>About Place</Text>
            <Text style={styles.cardSub}>AI Guide</Text>
          </TouchableOpacity>

          {/* 4. Facts Button */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/facts', params: { placeData: JSON.stringify(place) } })}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="bar-chart-outline" size={24} color="#000" />
            </View>
            <Text style={styles.cardTitle}>Facts</Text>
            <Text style={styles.cardSub}>Dimensions</Text>
          </TouchableOpacity>

          {/* 5. Map View Button */}
          <TouchableOpacity
            style={[styles.card, styles.mapCard]}
            onPress={() => {
              if (place.location && place.location.coordinates) {
                router.push({
                  pathname: '/map',
                  params: { lat: place.location.coordinates[1], lng: place.location.coordinates[0], name: place.name }
                });
              } else {
                Alert.alert("Error", "Location data missing.");
              }
            }}
          >
            <View style={[styles.iconCircle, { marginBottom: 0, marginRight: 15 }]}>
              <Ionicons name="map-outline" size={24} color="#000" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Map View</Text>
              <Text style={styles.cardSub}>See Location</Text>
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { padding: 20, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  imageCard: { position: 'relative', borderRadius: 25, overflow: 'hidden', height: 250, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, backgroundColor: '#000' },
  gpsBadge: { position: 'absolute', bottom: 15, left: 15, backgroundColor: '#FACC15', flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center', gap: 5 },
  gpsText: { fontWeight: 'bold', fontSize: 12 },
  paginationContainer: { position: 'absolute', bottom: 15, alignSelf: 'center', flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activeDot: { backgroundColor: '#FACC15', width: 20 },
  inactiveDot: { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  infoSection: { marginTop: 20, marginBottom: 16 },
  placeTitle: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 5 },
  locationText: { color: '#666', fontSize: 14 },

  // ── Artifact Scanner Banner ──
  scannerBanner: {
    backgroundColor: '#FACC15',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scannerBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scannerIconCircle: {
    width: 46, height: 46, backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 23, justifyContent: 'center', alignItems: 'center',
  },
  scannerBannerTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  scannerBannerSub: { fontSize: 12, color: '#555', marginTop: 2 },
  scannerBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scannerAiTag: {
    backgroundColor: '#000', color: '#FACC15',
    fontSize: 10, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, letterSpacing: 1,
  },

  // Scan alone button (no GPS)
  scannerBtnAlone: {
    marginTop: 16, backgroundColor: '#FACC15',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  scannerBtnAloneText: { fontWeight: 'bold', color: '#000', fontSize: 15 },

  // Grid
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
  card: { width: (width - 55) / 2, backgroundColor: '#fff', padding: 15, borderRadius: 20, height: 140, justifyContent: 'center' },
  mapCard: { width: '100%', height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 20 },
  yellowCard: { backgroundColor: '#FACC15' },
  iconCircle: { width: 40, height: 40, backgroundColor: '#F4F4F5', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  iconCircleBlack: { width: 40, height: 40, backgroundColor: '#000', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  cardTitleBlack: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  cardSubBlack: { fontSize: 12, color: '#333', marginTop: 2 },
  retryBtn: { marginTop: 20, backgroundColor: '#FACC15', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
});