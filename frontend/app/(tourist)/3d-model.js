import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ThreeDModelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 

  // 1. Get the TWO URLs passed from the Database
  const nowUrl = params.nowUrl;
  const thenUrl = params.thenUrl;

  // 2. Set Default Mode
  // If we have a 'Then' url, start with that (history first). Otherwise start with 'Now'.
  const [activeMode, setActiveMode] = useState(thenUrl ? 'then' : 'now'); 

  // 3. Decide which URL to show right now
  // If activeMode is 'now', try showing nowUrl. If it's missing, fall back to thenUrl.
  const currentModelUrl = activeMode === 'now' ? (nowUrl || thenUrl) : (thenUrl || nowUrl);

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
          src="${currentModelUrl}" 
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
      
      {/* Safety Check: Only show WebView if we have a valid link */}
      {currentModelUrl ? (
          <WebView
            key={activeMode} // Forces reload when switching modes
            source={{ html: htmlContent, baseUrl: '' }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            androidLayerType="hardware" 
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={{marginTop: 10, color: '#555'}}>
                    Loading {activeMode === 'now' ? "Modern" : "Ancient"} View...
                </Text>
              </View>
            )}
          />
      ) : (
          <View style={styles.center}>
              <Text>No 3D Model URL provided in Database.</Text>
              <Text style={{fontSize: 10, color: '#999', marginTop: 5}}>
                (Check if you added model3DNowUrl/model3DThenUrl in Admin Panel)
              </Text>
          </View>
      )}

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      {/* Toggle Buttons (Only show if we have BOTH links) */}
      {nowUrl && thenUrl && (
        <View style={styles.toggleContainer}>
            <TouchableOpacity 
                style={[styles.toggleBtn, activeMode === 'now' ? styles.activeBtn : styles.inactiveBtn]}
                onPress={() => setActiveMode('now')}
            >
                <Text style={[styles.btnText, activeMode === 'now' ? styles.activeText : styles.inactiveText]}>NOW</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.toggleBtn, activeMode === 'then' ? styles.activeBtn : styles.inactiveBtn]}
                onPress={() => setActiveMode('then')}
            >
                <Text style={[styles.btnText, activeMode === 'then' ? styles.activeText : styles.inactiveText]}>THEN</Text>
            </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'
  },
  backButton: {
    position: 'absolute', top: 50, left: 20,
    backgroundColor: 'white', padding: 10, borderRadius: 50, 
    elevation: 5, shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  toggleContainer: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 30, padding: 5, elevation: 10,
  },
  toggleBtn: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 25 },
  activeBtn: { backgroundColor: '#FACC15' },
  inactiveBtn: { backgroundColor: 'transparent' },
  btnText: { fontWeight: 'bold', fontSize: 14 },
  activeText: { color: 'black' },
  inactiveText: { color: 'white' }
});