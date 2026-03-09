import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile as updateFirebaseAuthProfile } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../constants/theme";
import { db, auth } from "../../config/firebase";
import api from "../../constants/api";

function InputField({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        <View style={styles.inputIconBox}>
          <Ionicons name={icon} size={18} color={Colors.primary} />
        </View>

        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          blurOnSubmit={false}
        />
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, userProfile, setUserProfile } = useAuth();

  const [name, setName] = useState(userProfile?.name || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [bio, setBio] = useState(userProfile?.bio || "");
  const [location, setLocation] = useState(userProfile?.location || "");
  const [profileImage, setProfileImage] = useState(userProfile?.profileImage || "");
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const email = user?.email || "";

  const initial = useMemo(() => {
    return (name || userProfile?.name || "H").trim().charAt(0).toUpperCase();
  }, [name, userProfile]);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter your name.");
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Needed",
          "Please allow photo library access to select a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setProfileImage(asset.uri);
      setRemoveProfileImage(false);
    } catch (error) {
      console.log("Image pick error:", error);
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const removeImage = () => {
    Alert.alert("Remove Photo", "Do you want to remove your profile picture?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setProfileImage("");
          setRemoveProfileImage(true);
        },
      },
    ]);
  };

  const uploadImageToBackend = async (uri) => {
    const filename = uri.split("/").pop() || `profile-${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : "jpg";

    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

    const formData = new FormData();
    formData.append("profileImage", {
      uri,
      name: filename,
      type: mimeType,
    });

    const response = await api.post("/users/upload-profile-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response?.data?.imageUrl || "";
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!user?.uid) {
      Alert.alert("Error", "User session not found.");
      return;
    }

    try {
      setSaving(true);

      let finalProfileImage = userProfile?.profileImage || "";

      if (removeProfileImage) {
        finalProfileImage = "";
      } else if (profileImage && !profileImage.startsWith("http")) {
        finalProfileImage = await uploadImageToBackend(profileImage);
      } else if (profileImage && profileImage.startsWith("http")) {
        finalProfileImage = profileImage;
      }

      const updatedProfile = {
        uid: user.uid,
        email: user.email || "",
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        location: location.trim(),
        profileImage: finalProfileImage,
        role: userProfile?.role || userProfile?.userType || "host",
        userType: userProfile?.userType || userProfile?.role || "host",
        createdAt: userProfile?.createdAt || new Date().toISOString(),
      };

      if (userProfile?.country !== undefined) {
        updatedProfile.country = userProfile.country;
      }

      if (userProfile?.expertise !== undefined) {
        updatedProfile.expertise = userProfile.expertise;
      }

      await setDoc(doc(db, "users", user.uid), updatedProfile, { merge: true });

      if (auth.currentUser && name.trim()) {
        await updateFirebaseAuthProfile(auth.currentUser, {
          displayName: name.trim(),
          photoURL: finalProfileImage || null,
        });
      }

      setUserProfile(updatedProfile);

      Alert.alert("Success", "Profile updated successfully.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("Profile update error:", error?.response?.data || error?.message);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <LinearGradient colors={["#1B5E20", "#0A2A0C"]} style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.roundBackBtn}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Edit Profile</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.profileTop}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              )}

              <Text style={styles.namePreview}>{name || "Your Name"}</Text>
              {!!email && <Text style={styles.emailPreview}>{email}</Text>}

              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.photoBtn}
                  onPress={pickImage}
                  activeOpacity={0.85}
                >
                  <Ionicons name="image-outline" size={16} color={Colors.primary} />
                  <Text style={styles.photoBtnText}>
                    {profileImage ? "Change Photo" : "Add Photo"}
                  </Text>
                </TouchableOpacity>

                {profileImage ? (
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={removeImage}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <InputField
                icon="person-outline"
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
              />

              <InputField
                icon="call-outline"
                label="Phone Number"
                placeholder="Enter your phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              <InputField
                icon="location-outline"
                label="Location"
                placeholder="Enter your location"
                value={location}
                onChangeText={setLocation}
              />

              <InputField
                icon="document-text-outline"
                label="Bio"
                placeholder="Write a short bio about yourself"
                value={bio}
                onChangeText={setBio}
                multiline
              />
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.infoText}>
                A clear photo and friendly profile help tourists trust your host account.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              activeOpacity={0.9}
              disabled={saving}
            >
              <LinearGradient
                colors={[Colors.primary, "#388E3C"]}
                style={styles.saveBtnGradient}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },

  header: {
    paddingTop: 58,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  roundBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },

  profileTop: {
    alignItems: "center",
    marginTop: 18,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },

  avatarText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
  },

  namePreview: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  emailPreview: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.86)",
  },

  photoActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 10,
  },

  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 8,
  },

  photoBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  removePhotoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },

  inputGroup: {
    marginBottom: 14,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 54,
    paddingHorizontal: 10,
  },

  inputWrapMultiline: {
    alignItems: "flex-start",
    minHeight: 128,
    paddingTop: 10,
  },

  inputIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },

  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 2,
  },

  infoCard: {
    marginTop: 14,
    backgroundColor: "#F0F9F1",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8EEDB",
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#3F4A40",
    fontWeight: "500",
  },

  saveBtn: {
    marginTop: 18,
    borderRadius: 16,
    overflow: "hidden",
  },

  saveBtnGradient: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});