import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Dimensions, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// REPLACE WITH YOUR ACTUAL LOCAL IP ADDRESS
const API_URL = 'http://192.168.8.101:5000/api/places'; 

const { width } = Dimensions.get('window');

export default function PlaceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState(null);

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    setLoading(true);
    try {
      // 1. Request Permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to find nearby places.');
        setLoading(false);
        return;
      }

      // 2. Get User's REAL Current Location
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      
      // 3. Extract the real coordinates
      const { latitude, longitude } = location.coords;
      console.log("📍 Detected Real Location:", latitude, longitude);

      // 4. Send REAL coordinates to Backend
      fetchNearbyPlace(latitude, longitude);

    } catch (error) {
      console.error("Location Error:", error);
      Alert.alert("GPS Error", "Make sure your location is turned on.");
      setLoading(false);
    }
  };

  const fetchNearbyPlace = async (lat, lng) => {
    try {
      console.log(`📡 Checking Backend for place near: ${lat}, ${lng}`);
      const response = await axios.get(`${API_URL}/nearby`, {
        params: { lat, lng }
      });

      if (response.data.message) {
        // No place found logic
        console.log("Backend Response:", response.data.message);
        setPlace(null);
      } else {
        // Place found!
        console.log("✅ Place Found:", response.data.name);
        setPlace(response.data);
      }
    } catch (error) {
      console.error("API Error:", error);
      Alert.alert("Connection Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FACC15" />
        <Text style={{marginTop: 10, color: '#555'}}>Detecting Location...</Text>
      </View>
    );
  }

  if (!place) {
     return (
        <View style={styles.center}>
            <Ionicons name="location-outline" size={60} color="#ccc" />
            <Text style={{marginTop: 10, color: '#555'}}>No historical site detected nearby.</Text>
            <Text style={{fontSize: 12, color: '#999', marginTop: 5}}>(Try simulating location in Emulator)</Text>
            
            <TouchableOpacity onPress={detectLocation} style={styles.retryBtn}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Retry GPS</Text>
            </TouchableOpacity>

            {/* Back Button for safety */}
            <TouchableOpacity onPress={() => router.back()} style={{marginTop: 20}}>
                <Text style={{color: '#007BFF'}}>Go Back</Text>
            </TouchableOpacity>
        </View>
     );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auto-Detect</Text>
        <View style={{width: 24}} /> 
      </View>

      {/* Main Image Card */}
      <View style={styles.imageCard}>
        <Image 
          source={{ uri: place.images?.[0] || 'https://via.placeholder.com/400' }} 
          style={styles.mainImage} 
        />
        <View style={styles.gpsBadge}>
            <Ionicons name="locate" size={16} color="#000" />
            <Text style={styles.gpsText}>GPS MATCHED</Text>
        </View>
        <TouchableOpacity style={styles.favBtn}>
            <Ionicons name="heart" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Title Section */}
      <View style={styles.infoSection}>
        <Text style={styles.placeTitle}>{place.name}</Text>
        <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={16} color="#888" />
            <Text style={styles.locationText}>
                {place.description ? place.description.substring(0, 40) + "..." : "Historical Site"}
            </Text>
        </View>
      </View>

      {/* Grid Buttons */}
      <View style={styles.gridContainer}>
        {/* AR View */}
        <TouchableOpacity style={[styles.card, styles.yellowCard]}>
            <View style={styles.iconCircleBlack}>
                 <Ionicons name="scan-outline" size={24} color="#FACC15" />
            </View>
            <Text style={styles.cardTitleBlack}>AR View</Text>
            <Text style={styles.cardSubBlack}>Live Overlay</Text>
        </TouchableOpacity>

        {/* 3D Model - UPDATED LINK */}
        <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/3d-model')}
        >
            <View style={styles.iconCircle}>
                 <Ionicons name="cube-outline" size={24} color="#000" />
            </View>
            <Text style={styles.cardTitle}>3D Model</Text>
            <Text style={styles.cardSub}>Interactive</Text>
        </TouchableOpacity>

        {/* About Place -> Chatbot Link */}
        <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push({
                pathname: '/place-chat',
                params: { 
                    placeId: place._id, 
                    placeName: place.name 
                }
            })}
        >
            <View style={styles.iconCircle}>
                 <Ionicons name="chatbubble-ellipses-outline" size={24} color="#000" />
            </View>
            <Text style={styles.cardTitle}>About Place</Text>
            <Text style={styles.cardSub}>AI Guide</Text>
        </TouchableOpacity>

     
       {/* Facts - BUTTON UPDATED */}
<TouchableOpacity 
    style={styles.card}
    onPress={() => router.push({
        pathname: '/facts',
        params: { placeData: JSON.stringify(place) } // We pass the whole object as a string
    })}
>
    <View style={styles.iconCircle}>
         <Ionicons name="bar-chart-outline" size={24} color="#000" />
    </View>
    <Text style={styles.cardTitle}>Facts</Text>
    <Text style={styles.cardSub}>Dimensions</Text>
</TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  imageCard: { position: 'relative', borderRadius: 25, overflow: 'hidden', height: 250, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  mainImage: { width: '100%', height: '100%' },
  gpsBadge: { position: 'absolute', bottom: 15, left: 15, backgroundColor: '#FACC15', flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center', gap: 5 },
  gpsText: { fontWeight: 'bold', fontSize: 12 },
  favBtn: { position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 50 },
  infoSection: { marginTop: 20, marginBottom: 20 },
  placeTitle: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 5 },
  locationText: { color: '#666', fontSize: 14 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
  card: { width: (width - 55) / 2, backgroundColor: '#fff', padding: 15, borderRadius: 20, height: 140, justifyContent: 'center' },
  yellowCard: { backgroundColor: '#FACC15' },
  iconCircle: { width: 40, height: 40, backgroundColor: '#F4F4F5', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  iconCircleBlack: { width: 40, height: 40, backgroundColor: '#000', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  cardTitleBlack: { fontSize: 16, fontWeight: 'bold', color: '#000' }, 
  cardSubBlack: { fontSize: 12, color: '#333', marginTop: 2 },
  retryBtn: { marginTop: 20, backgroundColor: '#FACC15', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }
});