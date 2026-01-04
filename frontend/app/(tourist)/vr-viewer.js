import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function VRViewerScreen() {
    const router = useRouter();
    const { videoUrl } = useLocalSearchParams();
    const [isLoading, setIsLoading] = useState(true);

    // My video link in cloudinary
    const actualVideoUrl = videoUrl || 'https://res.cloudinary.com/dvradstnd/video/upload/v1767450728/nature_m4a7ii.mp4';

    const vrHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
        </head>
        <body style="margin: 0; background-color: #000;">
          <div id="click-to-play" style="position:fixed; top:0; left:0; width:100%; height:100%; z-index:9999; display:flex; justify-content:center; align-items:center; background:rgba(0,0,0,0.5); color:white; font-family:sans-serif;">
             <p>Tap to start 360° Experience</p>
          </div>

          <a-scene vr-mode-ui="enabled: true" loading-screen="enabled: false">
            <a-assets timeout="10000">
              <video id="v" src="${actualVideoUrl}" 
                     autoplay="true" 
                     muted="true" 
                     crossorigin="anonymous" 
                     playsinline 
                     webkit-playsinline
                     onloadeddata="window.ReactNativeWebView.postMessage('loaded')"></video>
            </a-assets>

            <a-videosphere src="#v" rotation="0 -90 0"></a-videosphere>
            <a-entity camera look-controls position="0 1.6 0"></a-entity>
          </a-scene>

          <script>
            var v = document.querySelector('#v');

            // Handle user interaction to start playback
            document.body.addEventListener('click', function() {
              v.play();
              document.querySelector('#click-to-play').style.display = 'none';
            }, {once: true});

            // Listen for the video to finish
            v.addEventListener('ended', function() {
              window.ReactNativeWebView.postMessage('videoEnded');
            });
          </script>
        </body>
      </html>
    `;

    return (
        <View style={styles.container}>
            <WebView 
                originWhitelist={['*']} 
                source={{ html: vrHtml }} 
                style={styles.webview} 
                allowsInlineMediaPlayback={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={(event) => { 
                    const message = event.nativeEvent.data;
                    
                    if (message === 'loaded') {
                        setIsLoading(false);
                    } else if (message === 'videoEnded') {
                        // Safe navigation check: prevent "GO_BACK was not handled" error
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            // Fallback if there is no history stack
                            router.replace('/'); 
                        }
                    }
                }}
            />
            {isLoading && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                    <Text style={styles.loaderText}>Loading 360° Experience...</Text>
                </View>
            )}
            <TouchableOpacity 
                style={styles.backBtn} 
                onPress={() => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/');
                    }
                }}
            >
                <Ionicons name="arrow-back-circle" size={50} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    webview: { flex: 1 },
    backBtn: { position: 'absolute', top: 40, left: 20, zIndex: 100 },
    loaderContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    loaderText: { marginTop: 10, color: 'white', fontSize: 16 }
});