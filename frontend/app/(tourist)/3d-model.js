import React from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router'; // 1. Import router
import { Ionicons } from '@expo/vector-icons'; // 2. Import Icons

export default function ThreeDModelScreen() {
  const router = useRouter(); // 3. Initialize router

  const modelUrl = "https://cdn.jsdelivr.net/gh/JuneCeaser/3d-models@main/Jethawanaramaya.glb";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
        <style>
          body { margin: 0; background-color: #f0f0f0; height: 100vh; }
          model-viewer { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <model-viewer 
          src="${modelUrl}" 
          camera-controls 
          auto-rotate 
          shadow-intensity="1"
          alt="A 3D model">
        </model-viewer>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      
      {/* The 3D View */}
      <WebView
        source={{ html: htmlContent, baseUrl: '' }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        androidLayerType="hardware" 
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
      />

      {/* 👇 THE FLOATING BACK BUTTON */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white'
  },
  // Style for the floating button
  backButton: {
    position: 'absolute',
    top: 50, // Pushes it down from the status bar
    left: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 50, // Makes it a perfect circle
    elevation: 5, // Adds shadow on Android
    shadowColor: '#000', // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});