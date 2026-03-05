// frontend/app/(host)/add-culture.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';
import { Colors } from '../../constants/theme';

export default function AddCultureScreen() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { editId } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [isFocus, setIsFocus] = useState(false);

  // image preview URI (can be local file:// or https)
  const [image, setImage] = useState(null);

  // ✅ keep existing images from DB so we don't wipe them on edit
  const [existingImages, setExistingImages] = useState([]);

  const categories = [
    { label: 'Cooking', value: 'Cooking' },
    { label: 'Farming', value: 'Farming' },
    { label: 'Handicraft', value: 'Handicraft' },
    { label: 'Fishing', value: 'Fishing' },
    { label: 'Dancing', value: 'Dancing' }
  ];

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    publicSummary: '',
    description: '',
    price: '',

    // Host-only hidden fields
    hostFullNotes: '',
    dosText: '',
    dontsText: '',
    faqText: '',
    keywordsText: '',
  });

  // ---------- helpers ----------
  const splitToList = (text) => {
    return (text || '')
      .split(/\n|,/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const parseFaqText = (text) => {
    const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
    const faqs = [];
    for (const line of lines) {
      if (line.includes('->')) {
        const [q, a] = line.split('->').map(x => x.trim());
        if (q && a) faqs.push({ q, a, tags: [] });
      }
    }
    return faqs;
  };

  // ---------- edit: load existing ----------
  useEffect(() => {
    if (!editId) return;

    const fetchDetails = async () => {
      try {
        // ✅ private host endpoint (must exist in backend routes)
        const res = await api.get(`/experiences/my/one/${editId}`);
        const exp = res.data;

        setFormData(prev => ({
          ...prev,
          title: exp.title || '',
          category: exp.category || '',
          publicSummary: exp.publicSummary || '',
          description: exp.description || '',
          price: exp.price != null ? String(exp.price) : '',

          hostFullNotes: exp.hostFullNotes || '',

          dosText: (exp.assistantKnowledge?.dosDonts?.do || []).join('\n'),
          dontsText: (exp.assistantKnowledge?.dosDonts?.dont || []).join('\n'),
          keywordsText: (exp.assistantKnowledge?.keywords || []).join(', '),
          faqText: (exp.assistantKnowledge?.faq || [])
            .map(x => `${x.q} -> ${x.a}`)
            .join('\n'),
        }));

        const imgs = Array.isArray(exp.images) ? exp.images : [];
        setExistingImages(imgs);

        if (imgs.length > 0) setImage(imgs[0]);
      } catch (e) {
        Alert.alert("Error", "Details fetch failed (edit mode). Check /experiences/my/one/:id route.");
      }
    };

    fetchDetails();
  }, [editId]);

  // ---------- image ----------
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "We need gallery permissions to upload photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const uploadImageToCloudinary = async (fileUri) => {
    if (!fileUri || fileUri.startsWith('http')) return fileUri;

    const data = new FormData();
    data.append('file', {
      uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
      type: 'image/jpeg',
      name: 'upload.jpg',
    });

    data.append('upload_preset', 'ceylon_mate_preset');

    const response = await fetch('https://api.cloudinary.com/v1_1/dvradstnd/image/upload', {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json', 'Content-Type': 'multipart/form-data' },
    });

    const result = await response.json();
    if (result.secure_url) return result.secure_url;

    console.error("Cloudinary Error Response:", result);
    return null;
  };

  // ---------- save ----------
  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert("Login Required", "Please login as a host.");
      return;
    }

    if (!formData.title || !formData.category || !formData.price || !formData.description) {
      Alert.alert("Error", "Required fields missing");
      return;
    }

    const priceNum = Number(formData.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      Alert.alert("Error", "Price must be a valid number (greater than 0).");
      return;
    }

    try {
      setLoading(true);

      // ✅ Upload only if a new local image is selected
      let finalImageUrl = image;
      if (image && !image.startsWith('http')) {
        const cloudUrl = await uploadImageToCloudinary(image);
        if (!cloudUrl) throw new Error("Image upload failed. Please try again.");
        finalImageUrl = cloudUrl;
      }

      // ✅ Convert optional AI fields
      const doList = splitToList(formData.dosText);
      const dontList = splitToList(formData.dontsText);
      const keywords = splitToList(formData.keywordsText);
      const faq = parseFaqText(formData.faqText);

      // ✅ hostName: IMPORTANT for tourist screens
      // Prefer userProfile.name (your DB) then firebase displayName.
      const hostName =
        userProfile?.name ||
        user?.displayName ||
        "Local Expert";

      // ✅ images:
      // - if new image chosen => use it
      // - else if edit mode => keep old images
      // - else empty
      const imagesToSend =
        finalImageUrl
          ? [finalImageUrl]
          : (editId ? existingImages : []);

      const dataToSend = {
        title: formData.title.trim(),
        category: formData.category,
        publicSummary: formData.publicSummary.trim(),
        description: formData.description.trim(),
        price: priceNum,

        host: user.uid,
        hostName,
        images: imagesToSend,
        rating: 5.0,

        // host-only
        hostFullNotes: formData.hostFullNotes.trim(),

        // optional knowledge seed
        assistantKnowledge: {
          longDescription: formData.hostFullNotes.trim(),
          dosDonts: { do: doList, dont: dontList },
          faq,
          keywords,
        },
      };

      if (editId) {
        await api.put(`/experiences/update/${editId}`, dataToSend);
        Alert.alert("Success", "Updated Successfully!");
      } else {
        await api.post('/experiences/add', dataToSend);
        Alert.alert("Success", "Published Successfully!");
      }

      router.back();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Something went wrong.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient colors={[Colors.primary, '#1B5E20']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.surface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editId ? "Edit Experience" : "Create New Experience"}
          </Text>
          <View style={{ width: 34 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Share your authentic Sri Lankan cultural experience 🇱🇰
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Experience Image</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderBox}>
                <Ionicons name="camera-outline" size={40} color="#999" />
                <Text style={styles.placeholderText}>Select a Cover Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { marginTop: 25 }]}>
            Public Experience Details (Tourist can see)
          </Text>

          <Text style={styles.label}>Experience Title *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="pencil-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Pottery Workshop"
              placeholderTextColor="#999"
              value={formData.title}
              onChangeText={(t) => setFormData({ ...formData, title: t })}
            />
          </View>

          <Text style={styles.label}>Category *</Text>
          <Dropdown
            style={[styles.dropdown, isFocus && { borderColor: Colors.primary }]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            data={categories}
            labelField="label"
            valueField="value"
            placeholder="Select Category"
            value={formData.category}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={i => {
              setFormData({ ...formData, category: i.value });
              setIsFocus(false);
            }}
            renderLeftIcon={() => (
              <Ionicons name="grid-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
            )}
          />

          <Text style={styles.label}>Public Summary (short) — optional</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={3}
              placeholder="A short summary tourists will see..."
              placeholderTextColor="#999"
              value={formData.publicSummary}
              onChangeText={(t) => setFormData({ ...formData, publicSummary: t })}
            />
          </View>

          <Text style={styles.label}>Description *</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={5}
              placeholder="Tourist-visible description..."
              placeholderTextColor="#999"
              value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
            />
          </View>

          <Text style={styles.label}>Price (LKR) *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="cash-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="2500"
              placeholderTextColor="#999"
              value={formData.price}
              onChangeText={(t) => setFormData({ ...formData, price: t })}
            />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 25 }]}>
            Hidden Knowledge (Host only — helps Voice Assistant)
          </Text>

          <Text style={styles.helperNote}>
            Tourists will NOT see these. This helps the AI answer questions better.
            You can leave them empty if not needed.
          </Text>

          <Text style={styles.label}>Host Full Notes (A–Z details) — optional</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={6}
              placeholder={`Write extra cultural knowledge here...\n\nExamples:\n- history\n- meanings\n- ethics\n- rules\n- myths\n- dress code\n- safety`}
              placeholderTextColor="#999"
              value={formData.hostFullNotes}
              onChangeText={(t) => setFormData({ ...formData, hostFullNotes: t })}
            />
          </View>

          <Text style={styles.label}>Do’s (one per line or comma) — optional</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder={`Example:\n- Wash hands before cooking\n- Respect the temple area`}
              placeholderTextColor="#999"
              value={formData.dosText}
              onChangeText={(t) => setFormData({ ...formData, dosText: t })}
            />
          </View>

          <Text style={styles.label}>Don’ts (one per line or comma) — optional</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder={`Example:\n- Don’t point feet at elders\n- Don’t touch sacred objects`}
              placeholderTextColor="#999"
              value={formData.dontsText}
              onChangeText={(t) => setFormData({ ...formData, dontsText: t })}
            />
          </View>

          <Text style={styles.label}>FAQs (format: Question {'->'} Answer) — optional</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={5}
              placeholder={`Example:\nWhy do we use coconut milk? -> Because it adds richness and balances spices.\nHow do we extract coconut milk? -> Grate coconut, add warm water, squeeze.`}
              placeholderTextColor="#999"
              value={formData.faqText}
              onChangeText={(t) => setFormData({ ...formData, faqText: t })}
            />
          </View>

          <Text style={styles.label}>Keywords (comma separated) — optional</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="pricetag-outline" size={18} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="coconut, curry, tradition, spice"
              placeholderTextColor="#999"
              value={formData.keywordsText}
              onChangeText={(t) => setFormData({ ...formData, keywordsText: t })}
            />
          </View>
        </View>

        <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}>
          <LinearGradient colors={[Colors.primary, '#388E3C']} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>
                  {editId ? "Update Experience" : "Publish Experience"}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { color: '#fff', fontSize: 13, marginTop: 8, opacity: 0.9, textAlign: 'center' },
  iconButton: { padding: 5 },
  content: { flex: 1 },
  scrollContent: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: Colors.primary, paddingLeft: 10 },
  helperNote: { fontSize: 12, color: '#777', marginBottom: 10, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 15 },
  imagePicker: { height: 180, backgroundColor: '#F1F3F5', borderRadius: 15, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderBox: { alignItems: 'center' },
  placeholderText: { color: '#999', marginTop: 5, fontSize: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F3F5', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E9ECEF' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: Colors.text },
  textAreaContainer: { alignItems: 'flex-start', paddingTop: 12 },
  textArea: { flex: 1, fontSize: 15, color: Colors.text, minHeight: 90, textAlignVertical: 'top' },
  dropdown: { height: 50, backgroundColor: '#F1F3F5', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E9ECEF' },
  placeholderStyle: { fontSize: 15, color: '#999' },
  selectedTextStyle: { fontSize: 15, color: Colors.text },
  btn: { flexDirection: 'row', marginTop: 10, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
});