// ============================================================
// FILE: app/(tourist)/artifact-scanner.js
// CeylonMate — Artifact Scanner (Expo Go Compatible)
// Uses ImagePicker to open camera — NO native build needed
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Image, ScrollView, Animated, Dimensions, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

// ⚠️ Your laptop IP — change if different
const AI_SERVER = 'http://192.168.1.4:5001';

// ============================================================
// ARTIFACT DATABASE
// ============================================================
const ARTIFACT_INFO = {
  Buddha_Statue: {
    name: 'Buddha Statue', sinhala: 'බුදු පිළිමය',
    period: '3rd Century BCE – 12th Century CE',
    sites: ['Anuradhapura', 'Polonnaruwa', 'Dambulla'],
    description: 'Buddhist statues in Sri Lanka represent Gautama Buddha in various poses (mudras). The most iconic are the massive standing and seated statues at Aukana and Polonnaruwa, carved directly from rock.',
    significance: 'Placed at temples as objects of veneration. Pilgrims circumambulate them while chanting pirith (sacred verses).',
    material: 'Granite, Limestone, Brick (gilded)', height: 'Ranges from 0.3m to 15m+',
    icon: '🧘', color: '#B45309', lightColor: '#FEF3C7',
  },
  Moonstone: {
    name: 'Moonstone', sinhala: 'සඳකඩ පහන',
    period: '4th – 12th Century CE',
    sites: ['Anuradhapura', 'Polonnaruwa', 'Medirigiriya'],
    description: 'The Moonstone (Sandakada Pahana) is a semi-circular carved stone at temple staircases, featuring concentric bands of elephants, horses, lions, bulls, geese, and lotus petals.',
    significance: 'Each band carries deep symbolic meaning. The lotus at center represents nirvana — the goal of Buddhist practice.',
    material: 'Granite, Limestone', height: '0.3m – 0.6m thick, 1m – 2m diameter',
    icon: '🌙', color: '#1D4ED8', lightColor: '#DBEAFE',
  },
  Guardstone: {
    name: 'Guardstone', sinhala: 'මුරගල',
    period: '4th – 8th Century CE', sites: ['Anuradhapura', 'Polonnaruwa'],
    description: 'Upright stone slabs placed on either side of stairways to sacred buildings, depicting a deity standing on a mythical sea creature.',
    significance: 'Believed to protect the sacred building from evil spirits.',
    material: 'Limestone, Granite', height: '1m – 1.5m',
    icon: '🗿', color: '#065F46', lightColor: '#D1FAE5',
  },
  Stone_Pillar: {
    name: 'Stone Pillar', sinhala: 'ගල් කුළුණ',
    period: '3rd Century BCE – 12th Century CE',
    sites: ['Anuradhapura', 'Polonnaruwa', 'Sigiriya'],
    description: 'Ancient stone pillars served structural, ceremonial, and inscriptional purposes. The 1,600 columns at the Brazen Palace are remarkable engineering feats.',
    significance: 'Used as structural columns, ceremonial lamp posts, and surfaces for royal inscriptions.',
    material: 'Granite', height: '2m – 8m',
    icon: '🏛️', color: '#6B21A8', lightColor: '#F3E8FF',
  },
  Mural: {
    name: 'Mural Painting', sinhala: 'බිතු සිතුවම',
    period: '1st Century BCE – 18th Century CE',
    sites: ['Dambulla', 'Sigiriya', 'Degaldoruwa'],
    description: 'Sri Lankan murals are among the finest in Asian painting. The Sigiriya frescoes are among the oldest surviving paintings in the world.',
    significance: 'Depicted Jataka tales and royal ceremonies to educate Buddhist devotees.',
    material: 'Natural pigments on lime plaster', height: 'Wall-sized panels',
    icon: '🎨', color: '#B91C1C', lightColor: '#FEE2E2',
  },
  Inscription_Slab: {
    name: 'Inscription Slab', sinhala: 'ශිලා ලේඛනය',
    period: '3rd Century BCE – 12th Century CE',
    sites: ['Anuradhapura', 'Polonnaruwa', 'Mihintale'],
    description: 'Stone tablets bearing royal edicts and religious proclamations in ancient Sinhala, Pali, Tamil, and Sanskrit scripts.',
    significance: 'Primary historical records of ancient Sri Lankan governance and religion.',
    material: 'Limestone, Granite', height: '0.5m – 3m',
    icon: '📜', color: '#92400E', lightColor: '#FEF3C7',
  },
  Stupa_Model: {
    name: 'Stupa Model', sinhala: 'දාගැබ් ආකෘතිය',
    period: '3rd Century BCE – Present',
    sites: ['Anuradhapura', 'Polonnaruwa', 'Kandy'],
    description: 'Miniature stupa models created as votive offerings, replicating the hemispherical dome that enshrines Buddhist relics.',
    significance: 'The stupa symbolizes the mind of the Buddha. The dome represents the cosmic mountain.',
    material: 'Stone, Clay, Bronze', height: '0.1m – 1m (models)',
    icon: '⛩️', color: '#0F766E', lightColor: '#CCFBF1',
  },
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ArtifactScanner() {
  const router = useRouter();

  const [mode, setMode] = useState('home'); // 'home' | 'loading' | 'result'
  const [capturedImage, setCapturedImage] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for scan button
  useEffect(() => {
    if (mode === 'home') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [mode]);

  // Slide in result card
  useEffect(() => {
    if (mode === 'result') {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [mode]);

  // ── Open native camera via ImagePicker ──────────────────
  const openCamera = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Needed',
          'Please allow camera access in your phone settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch native camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });

      // User cancelled
      if (result.canceled) return;

      const imageUri = result.assets[0].uri;
      setCapturedImage(imageUri);
      setMode('loading');
      await runDetection(imageUri);

    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  };

  // ── Open gallery via ImagePicker ─────────────────────────
  const openGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow gallery access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const imageUri = result.assets[0].uri;
      setCapturedImage(imageUri);
      setMode('loading');
      await runDetection(imageUri);

    } catch (err) {
      console.error('Gallery error:', err);
      Alert.alert('Error', 'Could not open gallery. Please try again.');
    }
  };

  // ── Send image to Python AI server ──────────────────────
  const runDetection = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'artifact.jpg',
      });

      const response = await fetch(`${AI_SERVER}/detect`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();

      if (!data.detected) {
        Alert.alert(
          'Not Detected 🔍',
          'No heritage artifact found.\n\nTips:\n• Get closer to the object\n• Make sure it is well lit\n• Try from a different angle',
          [{ text: 'Try Again', onPress: () => setMode('home') }]
        );
        return;
      }

      // Use info from server or local fallback
      const info = (data.info && data.info.name)
        ? data.info
        : ARTIFACT_INFO[data.class_name] || {};

      setDetectionResult({
        className: data.class_name,
        confidence: data.confidence,
        info,
      });
      setMode('result');

    } catch (err) {
      console.error('Detection error:', err);
      Alert.alert(
        'Connection Error ⚠️',
        `Could not reach AI server.\n\nCheck:\n• Python server is running\n• IP is correct: ${AI_SERVER}\n• Phone & laptop on same WiFi`,
        [{ text: 'OK', onPress: () => setMode('home') }]
      );
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setDetectionResult(null);
    setMode('home');
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================
  if (mode === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        {capturedImage && (
          <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} blurRadius={5} />
        )}
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FACC15" />
            <Text style={styles.loadingTitle}>Analyzing Artifact...</Text>
            <Text style={styles.loadingSub}>AI is identifying the heritage object</Text>
            <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
              {['Processing image', 'Running YOLOv8 model', 'Matching database'].map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="checkmark-circle" size={16} color="#FACC15" />
                  <Text style={{ color: '#ccc', fontSize: 13 }}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ============================================================
  // RESULT SCREEN
  // ============================================================
  if (mode === 'result' && detectionResult) {
    const { info, confidence, className } = detectionResult;
    const confPercent = Math.round(confidence * 100);
    const confColor = confPercent > 90 ? '#22C55E' : confPercent > 70 ? '#FACC15' : '#EF4444';

    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        {capturedImage && (
          <Image source={{ uri: capturedImage }} style={[StyleSheet.absoluteFill, { opacity: 0.25 }]} blurRadius={10} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.72)' }]} />

        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={resetScanner}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Captured photo */}
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            <View style={[styles.detectedBadge, { backgroundColor: info.color || '#B45309' }]}>
              <Text style={styles.detectedBadgeText}>✓ DETECTED</Text>
            </View>
          </View>

          {/* Result card */}
          <Animated.View style={[
            styles.resultCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>

            {/* Confidence bar */}
            <View style={styles.confRow}>
              <Text style={styles.confLabel}>Confidence</Text>
              <View style={styles.confBarBg}>
                <View style={[styles.confBarFill, {
                  width: `${confPercent}%`,
                  backgroundColor: confColor
                }]} />
              </View>
              <Text style={[styles.confText, { color: confColor }]}>{confPercent}%</Text>
            </View>

            {/* Name */}
            <View style={styles.nameRow}>
              <Text style={styles.nameEmoji}>{info.icon || '🏛️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.artifactName}>{info.name || className}</Text>
                <Text style={styles.sinhalaName}>{info.sinhala || ''}</Text>
              </View>
            </View>

            {/* Tags */}
            <View style={styles.tagRow}>
              {info.period && (
                <View style={[styles.tag, { backgroundColor: info.lightColor || '#FEF3C7' }]}>
                  <Ionicons name="time-outline" size={12} color={info.color || '#B45309'} />
                  <Text style={[styles.tagText, { color: info.color || '#B45309' }]}>{info.period}</Text>
                </View>
              )}
              {info.material && (
                <View style={[styles.tag, { backgroundColor: info.lightColor || '#FEF3C7' }]}>
                  <Ionicons name="layers-outline" size={12} color={info.color || '#B45309'} />
                  <Text style={[styles.tagText, { color: info.color || '#B45309' }]}>{info.material}</Text>
                </View>
              )}
            </View>

            {/* Found at */}
            {info.sites && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📍 Found At</Text>
                <View style={styles.sitesRow}>
                  {(Array.isArray(info.sites) ? info.sites : [info.sites]).map((site, i) => (
                    <View key={i} style={styles.siteChip}>
                      <Text style={styles.siteChipText}>{site}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* About */}
            {info.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📖 About</Text>
                <Text style={styles.descText}>{info.description}</Text>
              </View>
            )}

            {/* Cultural significance */}
            {info.significance && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>✨ Cultural Significance</Text>
                <View style={[styles.sigBox, { borderLeftColor: info.color || '#B45309' }]}>
                  <Text style={styles.sigText}>{info.significance}</Text>
                </View>
              </View>
            )}

            {/* Size */}
            {info.height && (
              <View style={[styles.statBox, { backgroundColor: info.lightColor || '#FEF3C7' }]}>
                <Ionicons name="resize-outline" size={20} color={info.color || '#B45309'} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.statLabel, { color: info.color || '#B45309' }]}>Typical Size</Text>
                  <Text style={[styles.statValue, { color: info.color || '#B45309' }]}>{info.height}</Text>
                </View>
              </View>
            )}

          </Animated.View>

          {/* Scan again button */}
          <TouchableOpacity style={styles.scanAgainBtn} onPress={resetScanner}>
            <Ionicons name="scan-outline" size={20} color="#000" />
            <Text style={styles.scanAgainText}>Scan Another Artifact</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    );
  }

  // ============================================================
  // HOME SCREEN — choose camera or gallery
  // ============================================================
  return (
    <View style={styles.homeContainer}>

      {/* Background decoration */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Header */}
      <View style={styles.homeHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.homeHeaderTitle}>Artifact Scanner</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main content */}
      <View style={styles.homeContent}>

        {/* Icon */}
        <Animated.View style={[styles.scanIconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.scanIconOuter}>
            <View style={styles.scanIconInner}>
              <Ionicons name="scan-outline" size={52} color="#000" />
            </View>
          </View>
        </Animated.View>

        <Text style={styles.homeTitle}>Identify Heritage{'\n'}Artifacts</Text>
        <Text style={styles.homeSub}>
          Point your camera at any ancient stone artifact to instantly learn its history, cultural significance, and where it can be found in Sri Lanka.
        </Text>

        {/* What can be detected */}
        <View style={styles.classesBox}>
          <Text style={styles.classesTitle}>Can identify:</Text>
          <View style={styles.classesGrid}>
            {Object.values(ARTIFACT_INFO).map((item, i) => (
              <View key={i} style={styles.classChip}>
                <Text style={styles.classChipIcon}>{item.icon}</Text>
                <Text style={styles.classChipText}>{item.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Camera button */}
        <TouchableOpacity style={styles.cameraBtn} onPress={openCamera} activeOpacity={0.85}>
          <Ionicons name="camera" size={26} color="#000" />
          <Text style={styles.cameraBtnText}>Open Camera</Text>
        </TouchableOpacity>

        {/* Gallery button */}
        <TouchableOpacity style={styles.galleryBtn} onPress={openGallery} activeOpacity={0.85}>
          <Ionicons name="images-outline" size={22} color="#FACC15" />
          <Text style={styles.galleryBtnText}>Choose from Gallery</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({

  // Loading
  loadingContainer: { flex: 1, backgroundColor: '#000' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center', alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#1A1A1A', borderRadius: 24, padding: 32,
    alignItems: 'center', width: width * 0.82,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  loadingTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 18 },
  loadingSub: { fontSize: 13, color: '#888', marginTop: 6, marginBottom: 22, textAlign: 'center' },

  // Home screen
  homeContainer: { flex: 1, backgroundColor: '#0A0A0A' },
  bgCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(250,204,21,0.06)', top: -80, right: -80,
  },
  bgCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(250,204,21,0.04)', bottom: 100, left: -60,
  },
  homeHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 10,
  },
  homeHeaderTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  homeContent: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  scanIconWrap: { alignSelf: 'center', marginBottom: 28 },
  scanIconOuter: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(250,204,21,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  scanIconInner: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: '#FACC15',
    justifyContent: 'center', alignItems: 'center',
  },

  homeTitle: {
    fontSize: 30, fontWeight: 'bold', color: '#fff',
    textAlign: 'center', lineHeight: 38, marginBottom: 14,
  },
  homeSub: {
    fontSize: 14, color: '#888', textAlign: 'center',
    lineHeight: 22, marginBottom: 24,
  },

  classesBox: {
    backgroundColor: '#161616', borderRadius: 16,
    padding: 16, marginBottom: 28,
    borderWidth: 1, borderColor: '#222',
  },
  classesTitle: { color: '#666', fontSize: 12, fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
  classesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  classChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1E1E1E', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 20,
  },
  classChipIcon: { fontSize: 13 },
  classChipText: { color: '#ccc', fontSize: 12 },

  cameraBtn: {
    backgroundColor: '#FACC15', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 18, gap: 10, marginBottom: 12,
    shadowColor: '#FACC15', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  cameraBtnText: { fontWeight: 'bold', fontSize: 17, color: '#000' },

  galleryBtn: {
    backgroundColor: '#161616', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 18, gap: 10,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  galleryBtnText: { fontWeight: '600', fontSize: 15, color: '#FACC15' },

  // Result screen
  resultScroll: { padding: 20, paddingBottom: 50, paddingTop: 55 },
  backBtn: {
    width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  previewContainer: {
    borderRadius: 20, overflow: 'hidden',
    height: 210, marginBottom: 20, position: 'relative',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  detectedBadge: {
    position: 'absolute', top: 12, right: 12,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  detectedBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.8 },

  resultCard: {
    backgroundColor: '#1A1A1A', borderRadius: 24,
    padding: 22, borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 16,
  },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  confLabel: { color: '#666', fontSize: 12, minWidth: 72 },
  confBarBg: { flex: 1, height: 6, backgroundColor: '#2A2A2A', borderRadius: 3, overflow: 'hidden' },
  confBarFill: { height: '100%', borderRadius: 3 },
  confText: { fontWeight: 'bold', fontSize: 15, minWidth: 42, textAlign: 'right' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  nameEmoji: { fontSize: 42 },
  artifactName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  sinhalaName: { fontSize: 14, color: '#aaa', marginTop: 3 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  tagText: { fontSize: 11, fontWeight: '600' },

  section: { marginBottom: 18 },
  sectionTitle: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 10 },

  sitesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  siteChip: { backgroundColor: '#2A2A2A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  siteChipText: { color: '#ccc', fontSize: 12 },

  descText: { color: '#aaa', fontSize: 13, lineHeight: 22 },

  sigBox: { borderLeftWidth: 3, paddingLeft: 14, backgroundColor: '#222', borderRadius: 8, padding: 14 },
  sigText: { color: '#ccc', fontSize: 13, lineHeight: 22 },

  statBox: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12 },
  statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: 'bold' },

  scanAgainBtn: {
    backgroundColor: '#FACC15', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, gap: 8,
  },
  scanAgainText: { fontWeight: 'bold', fontSize: 16, color: '#000' },
});