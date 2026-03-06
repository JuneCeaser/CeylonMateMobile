// frontend/app/(host)/add-culture.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Dropdown } from "react-native-element-dropdown";
import { useAuth } from "../../context/AuthContext";
import api from "../../constants/api";
import { Colors } from "../../constants/theme";

// ─── Blank slate for new experiences ───────────────────────────────────────
const INITIAL_FORM = {
  title: "",
  category: "",
  publicSummary: "",
  description: "",
  price: "",
  vrPreviewUrl: "",
  hostFullNotes: "",
  dosText: "",
  dontsText: "",
  faqText: "",
  keywordsText: "",
};

export default function AddCultureScreen() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { editId } = useLocalSearchParams();

  const [loading, setLoading]         = useState(false);
  const [isFocus, setIsFocus]         = useState(false);
  const [showHidden, setShowHidden]   = useState(false);
  const [image, setImage]             = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [formData, setFormData]       = useState(INITIAL_FORM);
  const [errors, setErrors]           = useState({});

  const categories = [
    { label: "🍳  Cooking",    value: "Cooking"    },
    { label: "🌾  Farming",    value: "Farming"    },
    { label: "🧶  Handicraft", value: "Handicraft" },
    { label: "🎣  Fishing",    value: "Fishing"    },
    { label: "💃  Dancing",    value: "Dancing"    },
  ];

  // ─── BUG FIX: reset form every time screen is focused for "Add New" ────────
  useFocusEffect(
    useCallback(() => {
      if (!editId) {
        setFormData(INITIAL_FORM);
        setImage(null);
        setExistingImages([]);
        setShowHidden(false);
        setErrors({});
      }
    }, [editId])
  );

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const splitToList = (text) =>
    (text || "").split(/\n|,/).map((s) => s.trim()).filter(Boolean);

  const parseFaqText = (text) => {
    const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean);
    const faqs = [];
    for (const line of lines) {
      if (line.includes("->")) {
        const [q, a] = line.split("->").map((x) => x.trim());
        if (q && a) faqs.push({ q, a, tags: [] });
      }
    }
    return faqs;
  };

  // ─── Edit mode: load existing data ────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/experiences/my/one/${editId}`);
        const exp = res.data;

        setFormData({
          title:        exp.title || "",
          category:     exp.category || "",
          publicSummary: exp.publicSummary || "",
          description:  exp.description || "",
          price:        exp.price != null ? String(exp.price) : "",
          vrPreviewUrl: exp.vrPreviewUrl || exp.vrPreview?.url || "",
          hostFullNotes: exp.hostFullNotes || "",
          dosText:      (exp.assistantKnowledge?.dosDonts?.do   || []).join("\n"),
          dontsText:    (exp.assistantKnowledge?.dosDonts?.dont || []).join("\n"),
          keywordsText: (exp.assistantKnowledge?.keywords || []).join(", "),
          faqText:      (exp.assistantKnowledge?.faq || [])
                          .map((x) => `${x.q} -> ${x.a}`)
                          .join("\n"),
        });

        const imgs = Array.isArray(exp.images) ? exp.images : [];
        setExistingImages(imgs);
        if (imgs.length > 0) setImage(imgs[0]);

        const hasHidden =
          !!exp.hostFullNotes ||
          (exp.assistantKnowledge?.dosDonts?.do   || []).length > 0 ||
          (exp.assistantKnowledge?.dosDonts?.dont || []).length > 0 ||
          (exp.assistantKnowledge?.faq      || []).length > 0 ||
          (exp.assistantKnowledge?.keywords || []).length > 0;
        if (hasHidden) setShowHidden(true);
      } catch {
        Alert.alert("Error", "Failed to load experience details.");
      }
    };
    fetchDetails();
  }, [editId]);

  // ─── Image ────────────────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Gallery access is required to upload photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const uploadImageToCloudinary = async (fileUri) => {
    if (!fileUri || fileUri.startsWith("http")) return fileUri;
    const data = new FormData();
    data.append("file", {
      uri:  Platform.OS === "android" ? fileUri : fileUri.replace("file://", ""),
      type: "image/jpeg",
      name: "upload.jpg",
    });
    data.append("upload_preset", "ceylon_mate_preset");
    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dvradstnd/image/upload",
      { method: "POST", body: data,
        headers: { Accept: "application/json", "Content-Type": "multipart/form-data" } }
    );
    const result = await response.json();
    return result.secure_url || null;
  };

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.title.trim())       e.title       = "Title is required";
    if (!formData.category)           e.category    = "Please select a category";
    if (!formData.description.trim()) e.description = "Description is required";
    if (!formData.price) {
      e.price = "Price is required";
    } else {
      const p = Number(formData.price);
      if (!Number.isFinite(p) || p <= 0) e.price = "Enter a valid price greater than 0";
    }
    if (formData.vrPreviewUrl?.trim()) {
      if (!/^https?:\/\/.+/i.test(formData.vrPreviewUrl.trim()))
        e.vrPreviewUrl = "Enter a valid URL starting with http:// or https://";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user?.uid) { Alert.alert("Login Required", "Please login as a host."); return; }
    if (!validate()) {
      Alert.alert("Missing Information", "Please fill in all required fields correctly.");
      return;
    }
    try {
      setLoading(true);
      let finalImageUrl = image;
      if (image && !image.startsWith("http")) {
        const cloudUrl = await uploadImageToCloudinary(image);
        if (!cloudUrl) throw new Error("Image upload failed. Please try again.");
        finalImageUrl = cloudUrl;
      }

      const hostName     = userProfile?.name || user?.displayName || "Local Expert";
      const imagesToSend = finalImageUrl ? [finalImageUrl] : editId ? existingImages : [];

      const dataToSend = {
        title:         formData.title.trim(),
        category:      formData.category,
        publicSummary: formData.publicSummary.trim(),
        description:   formData.description.trim(),
        price:         Number(formData.price),
        host:          user.uid,
        hostName,
        images:        imagesToSend,
        rating:        5.0,
        vrPreviewUrl:  formData.vrPreviewUrl.trim() || "",
        hostFullNotes: formData.hostFullNotes.trim(),
        assistantKnowledge: {
          longDescription: formData.hostFullNotes.trim(),
          dosDonts: {
            do:   splitToList(formData.dosText),
            dont: splitToList(formData.dontsText),
          },
          faq:      parseFaqText(formData.faqText),
          keywords: splitToList(formData.keywordsText),
        },
      };

      if (editId) {
        await api.put(`/experiences/update/${editId}`, dataToSend);
        Alert.alert("✅ Updated!", "Your experience has been updated successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        await api.post("/experiences/add", dataToSend);
        Alert.alert("🎉 Published!", "Your experience is now live for tourists.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Something went wrong.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Small reusable components ───────────────────────────────────────────
  const FieldError = ({ field }) =>
    errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* ── HEADER ── */}
      <LinearGradient colors={[Colors.primary, "#1B5E20"]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {editId ? "Edit Experience" : "New Experience"}
            </Text>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {editId ? "✏️  Editing" : "🆕  Creating"}
              </Text>
            </View>
          </View>

          <View style={{ width: 38 }} />
        </View>

        <Text style={styles.headerSubtitle}>
          Share your authentic Sri Lankan cultural experience 🇱🇰
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ═══════════════════════════════════════════════
            SECTION 1 — COVER PHOTO
        ════════════════════════════════════════════════ */}
        <View style={styles.card}>
          <SectionHeader
            step="1"
            title="Cover Photo"
            hint="Choose a clear, vibrant photo — first impressions matter."
          />

          <TouchableOpacity
            style={[styles.imagePicker, image && styles.imagePickerFilled]}
            onPress={pickImage}
            activeOpacity={0.85}
          >
            {image ? (
              <View style={{ width: "100%", height: "100%" }}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <View style={styles.imageOverlay}>
                  <Ionicons name="camera" size={18} color="#fff" />
                  <Text style={styles.imageOverlayText}>Change Photo</Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderBox}>
                <View style={styles.cameraCircle}>
                  <Ionicons name="camera-outline" size={30} color={Colors.primary} />
                </View>
                <Text style={styles.placeholderTitle}>Upload Cover Photo</Text>
                <Text style={styles.placeholderSub}>Recommended: 16:9  ·  Max 5 MB</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════
            SECTION 2 — BASIC INFO
        ════════════════════════════════════════════════ */}
        <View style={styles.card}>
          <SectionHeader
            step="2"
            title="Basic Information"
            hint="Core details tourists will see on your listing."
          />

          {/* Title */}
          <Text style={styles.label}>
            Experience Title <Req />
          </Text>
          <View style={[styles.inputRow, errors.title && styles.inputError]}>
            <Ionicons name="pencil-outline" size={17} color={errors.title ? "#EF4444" : Colors.primary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Traditional Pottery Workshop"
              placeholderTextColor="#9CA3AF"
              value={formData.title}
              onChangeText={(t) => updateField("title", t)}
            />
          </View>
          <FieldError field="title" />

          {/* Category */}
          <Text style={styles.label}>
            Category <Req />
          </Text>
          <Dropdown
            style={[
              styles.dropdown,
              isFocus       && styles.dropdownFocused,
              errors.category && styles.inputError,
            ]}
            placeholderStyle={styles.phStyle}
            selectedTextStyle={styles.selStyle}
            data={categories}
            labelField="label"
            valueField="value"
            placeholder="Select a category"
            value={formData.category}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={(i) => { updateField("category", i.value); setIsFocus(false); }}
            renderLeftIcon={() => (
              <Ionicons
                name="grid-outline"
                size={17}
                color={errors.category ? "#EF4444" : Colors.primary}
                style={styles.icon}
              />
            )}
          />
          <FieldError field="category" />

          {/* Summary */}
          <Text style={styles.label}>
            Short Summary <Opt />
          </Text>
          <View style={[styles.inputRow, styles.areaRow]}>
            <TextInput
              style={styles.textAreaSm}
              multiline
              numberOfLines={3}
              placeholder="A brief, catchy line tourists see in search results..."
              placeholderTextColor="#9CA3AF"
              value={formData.publicSummary}
              onChangeText={(t) => updateField("publicSummary", t)}
            />
          </View>

          {/* Description */}
          <Text style={styles.label}>
            Full Description <Req />
          </Text>
          <View style={[styles.inputRow, styles.areaRow, errors.description && styles.inputError]}>
            <TextInput
              style={styles.textAreaLg}
              multiline
              numberOfLines={6}
              placeholder="Describe what tourists will do, see, and take away from this experience..."
              placeholderTextColor="#9CA3AF"
              value={formData.description}
              onChangeText={(t) => updateField("description", t)}
            />
          </View>
          <FieldError field="description" />
        </View>

        {/* ═══════════════════════════════════════════════
            SECTION 3 — PRICING & VR
        ════════════════════════════════════════════════ */}
        <View style={styles.card}>
          <SectionHeader
            step="3"
            title="Pricing & Extras"
            hint="Set your per-person price and an optional VR preview."
          />

          {/* Price */}
          <Text style={styles.label}>
            Price per Person <Req />
          </Text>
          <View style={[styles.inputRow, errors.price && styles.inputError]}>
            <View style={styles.lkrBadge}>
              <Text style={styles.lkrText}>LKR</Text>
            </View>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g., 2500"
              placeholderTextColor="#9CA3AF"
              value={formData.price}
              onChangeText={(t) => updateField("price", t)}
            />
          </View>
          <FieldError field="price" />

          {/* VR */}
          <Text style={styles.label}>
            360° VR Preview Link <Opt />
          </Text>
          <View style={[styles.inputRow, errors.vrPreviewUrl && styles.inputError]}>
            <Ionicons
              name="videocam-outline"
              size={17}
              color={errors.vrPreviewUrl ? "#EF4444" : Colors.primary}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="https://youtube.com/..."
              placeholderTextColor="#9CA3AF"
              value={formData.vrPreviewUrl}
              onChangeText={(t) => updateField("vrPreviewUrl", t)}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
          <FieldError field="vrPreviewUrl" />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={15} color="#3B82F6" />
            <Text style={styles.infoText}>
              Supports YouTube, Google Drive, or any direct URL. You can add this later.
            </Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════
            SECTION 4 — AI KNOWLEDGE (collapsible)
        ════════════════════════════════════════════════ */}
        <View style={styles.hiddenCard}>
          <TouchableOpacity
            style={styles.hiddenToggle}
            onPress={() => setShowHidden((s) => !s)}
            activeOpacity={0.8}
          >
            <View style={styles.lockCircle}>
              <Ionicons name="lock-closed" size={14} color={Colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.hiddenTitle}>AI Voice Assistant Knowledge</Text>
              <Text style={styles.hiddenHint}>
                Private · Only you see this · Helps the AI answer tourist questions
              </Text>
            </View>

            <View style={[styles.chevronBox, showHidden && styles.chevronBoxActive]}>
              <Ionicons
                name={showHidden ? "chevron-up" : "chevron-down"}
                size={16}
                color={showHidden ? Colors.primary : "#6B7280"}
              />
            </View>
          </TouchableOpacity>

          {showHidden && (
            <View style={styles.hiddenBody}>
              <View style={styles.divider} />

              {/* Host Notes */}
              <Text style={styles.label}>
                Host Full Notes <Opt />
              </Text>
              <View style={[styles.hiddenInputRow, styles.areaRow]}>
                <TextInput
                  style={styles.textAreaLg}
                  multiline
                  numberOfLines={6}
                  placeholder={
                    "Share deeper cultural knowledge here:\n• Historical background\n• Cultural meanings & symbolism\n• Dress code or safety rules"
                  }
                  placeholderTextColor="#9CA3AF"
                  value={formData.hostFullNotes}
                  onChangeText={(t) => updateField("hostFullNotes", t)}
                />
              </View>

              {/* Do's & Don'ts — two columns */}
              <View style={styles.twoCol}>
                <View style={styles.halfCol}>
                  <Text style={styles.label}>✅ Do <Opt /></Text>
                  <View style={[styles.hiddenInputRow, styles.areaRow]}>
                    <TextInput
                      style={styles.textAreaSm}
                      multiline
                      numberOfLines={4}
                      placeholder={"• Wash hands before cooking\n• Remove shoes at entrance"}
                      placeholderTextColor="#9CA3AF"
                      value={formData.dosText}
                      onChangeText={(t) => updateField("dosText", t)}
                    />
                  </View>
                </View>
                <View style={styles.halfCol}>
                  <Text style={styles.label}>🚫 Do not <Opt /></Text>
                  <View style={[styles.hiddenInputRow, styles.areaRow]}>
                    <TextInput
                      style={styles.textAreaSm}
                      multiline
                      numberOfLines={4}
                      placeholder={"• Don't point feet at elders\n• Don't touch sacred objects"}
                      placeholderTextColor="#9CA3AF"
                      value={formData.dontsText}
                      onChangeText={(t) => updateField("dontsText", t)}
                    />
                  </View>
                </View>
              </View>

              {/* FAQs */}
              <Text style={styles.label}>FAQs <Opt /></Text>
              <Text style={styles.miniHelp}>
                Format each line as:  Question {"->"} Answer
              </Text>
              <View style={[styles.hiddenInputRow, styles.areaRow]}>
                <TextInput
                  style={styles.textAreaLg}
                  multiline
                  numberOfLines={5}
                  placeholder={
                    "Why coconut milk? -> It adds richness to curries.\nHow to extract it? -> Grate coconut, add warm water, then squeeze."
                  }
                  placeholderTextColor="#9CA3AF"
                  value={formData.faqText}
                  onChangeText={(t) => updateField("faqText", t)}
                />
              </View>

              {/* Keywords */}
              <Text style={styles.label}>Keywords <Opt /></Text>
              <View style={styles.hiddenInputRow}>
                <Ionicons name="pricetag-outline" size={17} color={Colors.primary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="coconut, curry, tradition, spice, culture"
                  placeholderTextColor="#9CA3AF"
                  value={formData.keywordsText}
                  onChangeText={(t) => updateField("keywordsText", t)}
                />
              </View>
              <Text style={styles.miniHelp}>
                Comma-separated. These help the AI respond faster and more accurately.
              </Text>
            </View>
          )}
        </View>

        {/* ── SAVE BUTTON ── */}
        <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85}>
          <LinearGradient
            colors={loading ? ["#9CA3AF", "#9CA3AF"] : [Colors.primary, "#388E3C"]}
            style={styles.btn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <View style={styles.btnInner}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.btnText}>Saving…</Text>
              </View>
            ) : (
              <View style={styles.btnInner}>
                <Ionicons
                  name={editId ? "save-outline" : "rocket-outline"}
                  size={22}
                  color="#fff"
                />
                <Text style={styles.btnText}>
                  {editId ? "Save Changes" : "Publish Experience"}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Tiny inline helpers ──────────────────────────────────────────────────────
const Req = () => <Text style={{ color: "#EF4444", fontWeight: "700" }}>*</Text>;
const Opt = () => (
  <Text style={{ color: "#9CA3AF", fontWeight: "400", fontSize: 12 }}>(optional)</Text>
);

function SectionHeader({ step, title, hint }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepText}>{step}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionHint}>{hint}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },

  // Header
  header: { paddingTop: 56, paddingBottom: 22, paddingHorizontal: 18 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 5,
  },
  headerBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)", fontSize: 13,
    marginTop: 12, textAlign: "center",
  },

  content: { flex: 1 },
  scrollContent: { padding: 16 },

  // Cards
  card: {
    backgroundColor: "#fff", borderRadius: 18,
    padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: "#EEF2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  // Section header inside card
  sectionHeader: {
    flexDirection: "row", alignItems: "flex-start",
    columnGap: 12, marginBottom: 16,
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  stepBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  stepText:    { color: "#fff", fontSize: 13, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sectionHint:  { fontSize: 12, color: "#6B7280", marginTop: 2 },

  // Labels
  label: {
    fontSize: 13, fontWeight: "600", color: "#374151",
    marginBottom: 8, marginTop: 14,
  },
  miniHelp: { fontSize: 12, color: "#6B7280", marginTop: 5, lineHeight: 18 },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 4, fontWeight: "500" },

  // Image picker
  imagePicker: {
    height: 190, backgroundColor: "#F8FAFC", borderRadius: 14,
    justifyContent: "center", alignItems: "center",
    overflow: "hidden", borderStyle: "dashed",
    borderWidth: 1.5, borderColor: "#D1D5DB", marginTop: 4,
  },
  imagePickerFilled: { borderStyle: "solid", borderColor: "#E5E7EB" },
  previewImage:     { width: "100%", height: "100%", resizeMode: "cover" },
  imageOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", paddingVertical: 10, columnGap: 6,
  },
  imageOverlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  placeholderBox:   { alignItems: "center", rowGap: 8 },
  cameraCircle: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: "#EEF6F0",
    alignItems: "center", justifyContent: "center",
  },
  placeholderTitle: { fontSize: 14, color: "#374151", fontWeight: "600" },
  placeholderSub:   { fontSize: 12, color: "#9CA3AF" },

  // Inputs
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F9FAFB", borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: "#E5E7EB", minHeight: 50,
  },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  areaRow:    { alignItems: "flex-start", paddingTop: 12, paddingBottom: 12 },
  icon:       { marginRight: 10 },
  input: {
    flex: 1, paddingVertical: 12, fontSize: 15, color: "#111827",
  },
  textAreaSm: {
    flex: 1, width: "100%", fontSize: 14, color: "#111827",
    minHeight: 90, textAlignVertical: "top", lineHeight: 22,
  },
  textAreaLg: {
    flex: 1, width: "100%", fontSize: 14, color: "#111827",
    minHeight: 110, textAlignVertical: "top", lineHeight: 22,
  },

  // Dropdown
  dropdown: {
    height: 50, backgroundColor: "#F9FAFB", borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: "#E5E7EB",
  },
  dropdownFocused: { borderColor: Colors.primary },
  phStyle:  { fontSize: 15, color: "#9CA3AF" },
  selStyle: { fontSize: 15, color: "#111827", fontWeight: "500" },

  // LKR badge inside price input
  lkrBadge: {
    backgroundColor: "#EEF2F7", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginRight: 10,
  },
  lkrText: { color: Colors.primary, fontWeight: "700", fontSize: 13 },

  // Info box
  infoBox: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#EFF6FF", borderRadius: 10,
    padding: 10, marginTop: 10, columnGap: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: "#3B82F6", lineHeight: 18 },

  // Hidden / AI card
  hiddenCard: {
    backgroundColor: "#fff", borderRadius: 18,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: "#E7EEF8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  hiddenToggle: {
    flexDirection: "row", alignItems: "center", columnGap: 12,
  },
  lockCircle: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#EEF6F0",
    alignItems: "center", justifyContent: "center",
  },
  hiddenTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  hiddenHint:  { fontSize: 12, color: "#6B7280", marginTop: 2 },
  chevronBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  chevronBoxActive: { backgroundColor: "#EEF6F0" },
  hiddenBody: { paddingTop: 2 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 14 },

  hiddenInputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FAFAFB", borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: "#E5E7EB", minHeight: 50,
  },

  // Two-column row for Do's / Don'ts
  twoCol:  { flexDirection: "row", columnGap: 10 },
  halfCol: { flex: 1 },

  // Save button
  btn: {
    marginTop: 6, padding: 17, borderRadius: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", columnGap: 10 },
  btnText:  { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.3 },
});
