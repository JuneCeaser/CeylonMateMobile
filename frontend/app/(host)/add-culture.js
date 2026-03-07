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
  Switch,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Dropdown } from "react-native-element-dropdown";
import { useAuth } from "../../context/AuthContext";
import api from "../../constants/api";
import { Colors } from "../../constants/theme";

const INITIAL_FORM = {
  title: "",
  category: "",
  publicSummary: "",
  description: "",
  price: "",
  duration: "",
  hostFullNotes: "",
  dosText: "",
  dontsText: "",
  faqText: "",
  keywordsText: "",

  placeName: "",
  address: "",
  city: "",
  district: "",
  latitude: "",
  longitude: "",
  shareExactLocation: false,
};

export default function AddCultureScreen() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { editId } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const [image, setImage] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [vrImage, setVrImage] = useState(null); // newly selected local 360 image
  const [existingVrPreview, setExistingVrPreview] = useState(""); // already saved backend URL

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [gettingLocation, setGettingLocation] = useState(false);

  const vrPreviewDisplay = vrImage || existingVrPreview || null;

  const categories = [
    { label: "🍳  Cooking", value: "Cooking" },
    { label: "🌾  Farming", value: "Farming" },
    { label: "🧶  Handicraft", value: "Handicraft" },
    { label: "🎣  Fishing", value: "Fishing" },
    { label: "💃  Dancing", value: "Dancing" },
  ];

  useFocusEffect(
    useCallback(() => {
      if (!editId) {
        setFormData(INITIAL_FORM);
        setImage(null);
        setExistingImages([]);
        setVrImage(null);
        setExistingVrPreview("");
        setShowHidden(false);
        setErrors({});
      }
    }, [editId])
  );

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const splitToList = (text) =>
    (text || "")
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

  const parseFaqText = (text) => {
    const lines = (text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const faqs = [];
    for (const line of lines) {
      if (line.includes("->")) {
        const [q, a] = line.split("->").map((x) => x.trim());
        if (q && a) faqs.push({ q, a, tags: [] });
      }
    }
    return faqs;
  };

  useEffect(() => {
    if (!editId) return;

    const fetchDetails = async () => {
      try {
        const res = await api.get(`/experiences/my/one/${editId}`);
        const exp = res.data;

        setFormData({
          title: exp.title || "",
          category: exp.category || "",
          publicSummary: exp.publicSummary || "",
          description: exp.description || "",
          price: exp.price != null ? String(exp.price) : "",
          duration: exp.duration || "",
          hostFullNotes: exp.hostFullNotes || "",
          dosText: (exp.assistantKnowledge?.dosDonts?.do || []).join("\n"),
          dontsText: (exp.assistantKnowledge?.dosDonts?.dont || []).join("\n"),
          keywordsText: (exp.assistantKnowledge?.keywords || []).join(", "),
          faqText: (exp.assistantKnowledge?.faq || [])
            .map((x) => `${x.q} -> ${x.a}`)
            .join("\n"),

          placeName: exp.location?.placeName || "",
          address: exp.location?.address || "",
          city: exp.location?.city || "",
          district: exp.location?.district || "",
          latitude:
            exp.location?.coordinates?.[1] != null
              ? String(exp.location.coordinates[1])
              : "",
          longitude:
            exp.location?.coordinates?.[0] != null
              ? String(exp.location.coordinates[0])
              : "",
          shareExactLocation: !!exp.location?.shareExactLocation,
        });

        const imgs = Array.isArray(exp.images) ? exp.images : [];
        setExistingImages(imgs);
        setImage(imgs[0] || null);

        const vrUrl = exp.vrPreview?.url || "";
        setExistingVrPreview(vrUrl);
        setVrImage(null);

        const hasHidden =
          !!exp.hostFullNotes ||
          (exp.assistantKnowledge?.dosDonts?.do || []).length > 0 ||
          (exp.assistantKnowledge?.dosDonts?.dont || []).length > 0 ||
          (exp.assistantKnowledge?.faq || []).length > 0 ||
          (exp.assistantKnowledge?.keywords || []).length > 0;

        if (hasHidden) setShowHidden(true);
      } catch (err) {
        Alert.alert("Error", "Failed to load experience details.");
      }
    };

    fetchDetails();
  }, [editId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Denied", "Gallery access is required to upload photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const pickVrImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Denied", "Gallery access is required to upload 360 preview.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const ratio = asset.width && asset.height ? asset.width / asset.height : 0;

      if (ratio && (ratio < 1.8 || ratio > 2.2)) {
        Alert.alert(
          "Invalid 360 Image",
          "Please select a panoramic 360 image with a wide 2:1 ratio, like 2048 × 1024."
        );
        return;
      }

      setVrImage(asset.uri);
    }
  };

  const useCurrentLocation = async () => {
    try {
      setGettingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = current.coords.latitude;
      const longitude = current.coords.longitude;

      updateField("latitude", String(latitude));
      updateField("longitude", String(longitude));

      const geo = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geo && geo.length > 0) {
        const g = geo[0];

        updateField(
          "address",
          [g.name, g.street, g.city || g.subregion, g.region, g.country]
            .filter(Boolean)
            .join(", ")
        );

        updateField("city", g.city || g.subregion || "");
        updateField("district", g.region || "");
        if (!formData.placeName) {
          updateField("placeName", g.name || g.city || g.subregion || "Experience location");
        }
      }

      Alert.alert("Location Added", "Your current location has been added.");
    } catch (err) {
      Alert.alert("Location Error", "Could not fetch your current location.");
    } finally {
      setGettingLocation(false);
    }
  };

  const validate = () => {
    const e = {};

    if (!formData.title.trim()) e.title = "Title is required";
    if (!formData.category) e.category = "Please select a category";
    if (!formData.description.trim()) e.description = "Description is required";

    if (!formData.price) {
      e.price = "Price is required";
    } else {
      const p = Number(formData.price);
      if (!Number.isFinite(p) || p <= 0) e.price = "Enter a valid price greater than 0";
    }

    if (formData.latitude && Number.isNaN(Number(formData.latitude))) {
      e.latitude = "Latitude must be a valid number";
    }

    if (formData.longitude && Number.isNaN(Number(formData.longitude))) {
      e.longitude = "Longitude must be a valid number";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildImageFile = (uri, fallbackName) => {
    if (!uri || uri.startsWith("http")) return null;

    const cleanUri = Platform.OS === "ios" ? uri.replace("file://", "") : uri;
    const ext = uri.split(".").pop()?.toLowerCase();
    const fileType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

    return {
      uri: cleanUri,
      type: fileType,
      name: fallbackName,
    };
  };

  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert("Login Required", "Please login as a host.");
      return;
    }

    if (!validate()) {
      Alert.alert("Missing Information", "Please fill in all required fields correctly.");
      return;
    }

    try {
      setLoading(true);

      const hostName = userProfile?.name || user?.displayName || "Local Expert";

      const payload = new FormData();

      payload.append("title", formData.title.trim());
      payload.append("category", formData.category);
      payload.append("publicSummary", formData.publicSummary.trim());
      payload.append("description", formData.description.trim());
      payload.append("price", String(Number(formData.price)));
      payload.append("duration", formData.duration.trim());
      payload.append("hostName", hostName);

      payload.append("hostFullNotes", formData.hostFullNotes.trim());

      const assistantKnowledge = {
        longDescription: formData.hostFullNotes.trim(),
        dosDonts: {
          do: splitToList(formData.dosText),
          dont: splitToList(formData.dontsText),
        },
        faq: parseFaqText(formData.faqText),
        keywords: splitToList(formData.keywordsText),
      };

      payload.append("assistantKnowledge", JSON.stringify(assistantKnowledge));

      const hasAnyLocation =
        formData.latitude ||
        formData.longitude ||
        formData.address.trim() ||
        formData.city.trim() ||
        formData.district.trim() ||
        formData.placeName.trim();

      if (hasAnyLocation) {
        const longitude = formData.longitude ? Number(formData.longitude) : null;
        const latitude = formData.latitude ? Number(formData.latitude) : null;

        const location = {
          type: "Point",
          coordinates:
            longitude != null &&
            !Number.isNaN(longitude) &&
            latitude != null &&
            !Number.isNaN(latitude)
              ? [longitude, latitude]
              : undefined,
          address: formData.address.trim(),
          city: formData.city.trim(),
          district: formData.district.trim(),
          placeName: formData.placeName.trim(),
          shareExactLocation: !!formData.shareExactLocation,
        };

        payload.append("location", JSON.stringify(location));
      }

      const imageFile = buildImageFile(image, "experience-cover.jpg");
      if (imageFile) {
        payload.append("image", imageFile);
      }

      const vrImageFile = buildImageFile(vrImage, "vr-preview.jpg");
      if (vrImageFile) {
        payload.append("vrImage", vrImageFile);
      }

      if (editId) {
        await api.put(`/experiences/update/${editId}`, payload, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        Alert.alert("Updated!", "Your experience has been updated successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        await api.post("/experiences/add", payload, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        Alert.alert("Published!", "Your experience is now live for tourists.", [
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

  const FieldError = ({ field }) =>
    errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
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
                {editId ? "✏️ Editing" : "🆕 Creating"}
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
        <View style={styles.card}>
          <SectionHeader
            step="1"
            title="Cover Photo"
            hint="Choose a clear, vibrant photo — tourists will see this first."
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
                <Text style={styles.placeholderSub}>Recommended: 16:9 · Max 10 MB</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <SectionHeader
            step="2"
            title="Basic Information"
            hint="These are the public details tourists can see."
          />

          <Text style={styles.label}>
            Experience Title <Req />
          </Text>
          <View style={[styles.inputRow, errors.title && styles.inputError]}>
            <Ionicons
              name="pencil-outline"
              size={17}
              color={errors.title ? "#EF4444" : Colors.primary}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g., Traditional Batik Making Experience"
              placeholderTextColor="#9CA3AF"
              value={formData.title}
              onChangeText={(t) => updateField("title", t)}
            />
          </View>
          <FieldError field="title" />

          <Text style={styles.label}>
            Category <Req />
          </Text>
          <Dropdown
            style={[
              styles.dropdown,
              isFocus && styles.dropdownFocused,
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
            onChange={(i) => {
              updateField("category", i.value);
              setIsFocus(false);
            }}
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

          <Text style={styles.label}>
            Short Summary <Opt />
          </Text>
          <View style={[styles.inputRow, styles.areaRow]}>
            <TextInput
              style={styles.textAreaSm}
              multiline
              numberOfLines={3}
              placeholder="A short tourist-friendly summary for cards and previews..."
              placeholderTextColor="#9CA3AF"
              value={formData.publicSummary}
              onChangeText={(t) => updateField("publicSummary", t)}
            />
          </View>

          <Text style={styles.label}>
            Full Description <Req />
          </Text>
          <View style={[styles.inputRow, styles.areaRow, errors.description && styles.inputError]}>
            <TextInput
              style={styles.textAreaLg}
              multiline
              numberOfLines={6}
              placeholder="Describe what tourists will do, what they will learn, and what makes this experience special..."
              placeholderTextColor="#9CA3AF"
              value={formData.description}
              onChangeText={(t) => updateField("description", t)}
            />
          </View>
          <FieldError field="description" />

          <Text style={styles.label}>
            Duration <Opt />
          </Text>
          <View style={styles.inputRow}>
            <Ionicons
              name="time-outline"
              size={17}
              color={Colors.primary}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g., 2 hours"
              placeholderTextColor="#9CA3AF"
              value={formData.duration}
              onChangeText={(t) => updateField("duration", t)}
            />
          </View>
        </View>

        <View style={styles.card}>
          <SectionHeader
            step="3"
            title="Pricing & 360 Preview"
            hint="Set a price & add a 360° image to give tourists a sneak peek."
          />

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

          <Text style={styles.label}>
            360° Preview Image <Opt />
          </Text>

          <TouchableOpacity
            style={[styles.imagePickerSmall, vrPreviewDisplay && styles.imagePickerFilled]}
            onPress={pickVrImage}
            activeOpacity={0.85}
          >
            {vrPreviewDisplay ? (
              <View style={{ width: "100%", height: "100%" }}>
                <Image source={{ uri: vrPreviewDisplay }} style={styles.previewImage} />
                <View style={styles.imageOverlay}>
                  <Ionicons name="images-outline" size={18} color="#fff" />
                  <Text style={styles.imageOverlayText}>Change 360 Preview</Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderBox}>
                <View style={styles.cameraCircle}>
                  <Ionicons name="glasses-outline" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.placeholderTitle}>Upload 360 Preview Image</Text>
                <Text style={styles.placeholderSub}>
                  Use a panoramic 360 image for immersive preview
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {!!existingVrPreview && !vrImage && (
            <Text style={styles.miniHelp}>
              Existing 360 preview already saved. Select a new image only if you want to replace it.
            </Text>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={15} color="#3B82F6" />
            <Text style={styles.infoText}>
              Use a wide 2:1 panoramic image like 2048 × 1024. This gives tourists an immersive 360° preview of your experience.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <SectionHeader
            step="4"
            title="Experience Location"
            hint="Add a location so tourists know where the experience happens."
          />

          <TouchableOpacity
            style={styles.locationBtn}
            onPress={useCurrentLocation}
            disabled={gettingLocation}
            activeOpacity={0.85}
          >
            <Ionicons name="locate-outline" size={18} color="#fff" />
            <Text style={styles.locationBtnText}>
              {gettingLocation ? "Getting Location..." : "Use Current Location"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>
            Place Name <Opt />
          </Text>
          <View style={styles.inputRow}>
            <Ionicons
              name="business-outline"
              size={17}
              color={Colors.primary}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g., Family batik studio"
              placeholderTextColor="#9CA3AF"
              value={formData.placeName}
              onChangeText={(t) => updateField("placeName", t)}
            />
          </View>

          <Text style={styles.label}>
            Address / Area <Opt />
          </Text>
          <View style={[styles.inputRow, styles.areaRow]}>
            <TextInput
              style={styles.textAreaSm}
              multiline
              numberOfLines={3}
              placeholder="e.g., Near Kandy town, Central Province"
              placeholderTextColor="#9CA3AF"
              value={formData.address}
              onChangeText={(t) => updateField("address", t)}
            />
          </View>

          <View style={styles.twoCol}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>
                City <Opt />
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Kandy"
                  placeholderTextColor="#9CA3AF"
                  value={formData.city}
                  onChangeText={(t) => updateField("city", t)}
                />
              </View>
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>
                District / Province <Opt />
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Central"
                  placeholderTextColor="#9CA3AF"
                  value={formData.district}
                  onChangeText={(t) => updateField("district", t)}
                />
              </View>
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>
                Latitude <Opt />
              </Text>
              <View style={[styles.inputRow, errors.latitude && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 7.2906"
                  placeholderTextColor="#9CA3AF"
                  value={formData.latitude}
                  onChangeText={(t) => updateField("latitude", t)}
                  keyboardType="numeric"
                />
              </View>
              <FieldError field="latitude" />
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>
                Longitude <Opt />
              </Text>
              <View style={[styles.inputRow, errors.longitude && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 80.6337"
                  placeholderTextColor="#9CA3AF"
                  value={formData.longitude}
                  onChangeText={(t) => updateField("longitude", t)}
                  keyboardType="numeric"
                />
              </View>
              <FieldError field="longitude" />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.switchTitle}>Show exact location publicly</Text>
              <Text style={styles.switchSub}>
                Turn this off if you want tourists to see only the general area before booking.
              </Text>
            </View>
            <Switch
              value={formData.shareExactLocation}
              onValueChange={(v) => updateField("shareExactLocation", v)}
              trackColor={{ false: "#D1D5DB", true: "#A7F3D0" }}
              thumbColor={formData.shareExactLocation ? Colors.primary : "#F9FAFB"}
            />
          </View>
        </View>

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
                Private · Hidden from tourists · Used only to improve AI answers
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

              <Text style={styles.label}>
                Host Full Notes <Opt />
              </Text>
              <View style={[styles.hiddenInputRow, styles.areaRow]}>
                <TextInput
                  style={styles.textAreaLg}
                  multiline
                  numberOfLines={6}
                  placeholder={
                    "Add private knowledge here:\n• history and symbolism\n• material meanings\n• etiquette and rules\n• what tourists usually ask"
                  }
                  placeholderTextColor="#9CA3AF"
                  value={formData.hostFullNotes}
                  onChangeText={(t) => updateField("hostFullNotes", t)}
                />
              </View>

              <View style={styles.privateWarnBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
                <Text style={styles.privateWarnText}>
                  These notes are not shown on the tourist experience page.
                </Text>
              </View>

              <View style={styles.twoCol}>
                <View style={styles.halfCol}>
                  <Text style={styles.label}>
                    ✅ Do <Opt />
                  </Text>
                  <View style={[styles.hiddenInputRow, styles.areaRow]}>
                    <TextInput
                      style={styles.textAreaSm}
                      multiline
                      numberOfLines={4}
                      placeholder={"• Listen carefully to instructions\n• Handle tools gently"}
                      placeholderTextColor="#9CA3AF"
                      value={formData.dosText}
                      onChangeText={(t) => updateField("dosText", t)}
                    />
                  </View>
                </View>

                <View style={styles.halfCol}>
                  <Text style={styles.label}>
                    🚫 Do not <Opt />
                  </Text>
                  <View style={[styles.hiddenInputRow, styles.areaRow]}>
                    <TextInput
                      style={styles.textAreaSm}
                      multiline
                      numberOfLines={4}
                      placeholder={"• Do not touch hot wax carelessly\n• Do not waste dye materials"}
                      placeholderTextColor="#9CA3AF"
                      value={formData.dontsText}
                      onChangeText={(t) => updateField("dontsText", t)}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.label}>
                FAQs <Opt />
              </Text>
              <Text style={styles.miniHelp}>
                Format each line as: Question {"->"} Answer
              </Text>
              <View style={[styles.hiddenInputRow, styles.areaRow]}>
                <TextInput
                  style={styles.textAreaLg}
                  multiline
                  numberOfLines={5}
                  placeholder={
                    "Why is wax used? -> Wax blocks dye and creates patterns.\nIs batik traditional? -> Yes, it is a long-standing textile art form."
                  }
                  placeholderTextColor="#9CA3AF"
                  value={formData.faqText}
                  onChangeText={(t) => updateField("faqText", t)}
                />
              </View>

              <Text style={styles.label}>
                Keywords <Opt />
              </Text>
              <View style={styles.hiddenInputRow}>
                <Ionicons
                  name="pricetag-outline"
                  size={17}
                  color={Colors.primary}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="batik, wax, dye, fabric, tradition, design"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },

  header: { paddingTop: 56, paddingBottom: 22, paddingHorizontal: 18 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 5,
  },
  headerBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },

  content: { flex: 1 },
  scrollContent: { padding: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sectionHint: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 14,
  },
  miniHelp: { fontSize: 12, color: "#6B7280", marginTop: 5, lineHeight: 18 },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 4, fontWeight: "500" },

  imagePicker: {
    height: 190,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    marginTop: 4,
  },
  imagePickerSmall: {
    height: 170,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    marginTop: 4,
  },
  imagePickerFilled: { borderStyle: "solid", borderColor: "#E5E7EB" },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    columnGap: 6,
  },
  imageOverlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  placeholderBox: { alignItems: "center", rowGap: 8 },
  cameraCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#EEF6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderTitle: { fontSize: 14, color: "#374151", fontWeight: "600" },
  placeholderSub: { fontSize: 12, color: "#9CA3AF", textAlign: "center" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 50,
  },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  areaRow: { alignItems: "flex-start", paddingTop: 12, paddingBottom: 12 },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  textAreaSm: {
    flex: 1,
    width: "100%",
    fontSize: 14,
    color: "#111827",
    minHeight: 90,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  textAreaLg: {
    flex: 1,
    width: "100%",
    fontSize: 14,
    color: "#111827",
    minHeight: 110,
    textAlignVertical: "top",
    lineHeight: 22,
  },

  dropdown: {
    height: 50,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dropdownFocused: { borderColor: Colors.primary },
  phStyle: { fontSize: 15, color: "#9CA3AF" },
  selStyle: { fontSize: 15, color: "#111827", fontWeight: "500" },

  lkrBadge: {
    backgroundColor: "#EEF2F7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 10,
  },
  lkrText: { color: Colors.primary, fontWeight: "700", fontSize: 13 },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    columnGap: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: "#3B82F6", lineHeight: 18 },

  locationBtn: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
  },
  locationBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  switchRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  switchSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 18,
  },

  hiddenCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E7EEF8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  hiddenToggle: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
  },
  lockCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EEF6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  hiddenHint: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  chevronBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  chevronBoxActive: { backgroundColor: "#EEF6F0" },
  hiddenBody: { paddingTop: 2 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 14 },

  privateWarnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F9F4",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    columnGap: 8,
  },
  privateWarnText: {
    flex: 1,
    fontSize: 12,
    color: "#166534",
    lineHeight: 18,
    fontWeight: "500",
  },

  hiddenInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 50,
  },

  twoCol: { flexDirection: "row", columnGap: 10 },
  halfCol: { flex: 1 },

  btn: {
    marginTop: 6,
    padding: 17,
    borderRadius: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});