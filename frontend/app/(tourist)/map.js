import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const router = useRouter();
  const { lat, lng, name } = useLocalSearchParams();

  // Convert string params to numbers
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.01, // Zoom level (smaller = closer)
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={name}
          description="Historical Site Location"
        />
      </MapView>

      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Bottom Info Card */}
      <View style={styles.card}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>View on Map</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  backButton: {
    position: 'absolute', top: 50, left: 20,
    backgroundColor: '#fff', padding: 10, borderRadius: 25,
    elevation: 5
  },
  card: {
    position: 'absolute', bottom: 30, alignSelf: 'center',
    backgroundColor: '#fff', padding: 20, borderRadius: 15,
    width: '90%', elevation: 5, alignItems: 'center'
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#666', marginTop: 5 }
});