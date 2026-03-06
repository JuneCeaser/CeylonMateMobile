import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../constants/theme";

export default function ProfileScreen() {
  const { user, userProfile, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/auth/login");
          } catch (error) {
            console.error("Logout Error:", error);
            Alert.alert("Error", "Logout failed. Please try again.");
          }
        },
      },
    ]);
  };

  const displayName = userProfile?.name || "Local Host";
  const email = user?.email || "";
  const initial = (displayName || "H").trim().charAt(0).toUpperCase();

  const MenuItem = ({ icon, title, subtitle, onPress, danger }) => (
    <TouchableOpacity
      style={[styles.menuItem, danger && styles.menuItemDanger]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.menuIconBox, danger && styles.menuIconBoxDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? Colors.danger : Colors.primary}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, danger && { color: Colors.danger }]}>{title}</Text>
        {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>

      {!danger && <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <LinearGradient colors={["#1B5E20", "#0A2A0C"]} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.roundBackBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <Text style={styles.name}>{displayName}</Text>
            {!!email && <Text style={styles.email}>{email}</Text>}

            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
              <Text style={styles.badgeText}>Verified Host</Text>
              <Text style={styles.badgeFlag}>🇱🇰</Text>
            </View>
          </View>
        </LinearGradient>

        {/* CONTENT */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Account</Text>

          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your name and details"
            onPress={() => Alert.alert("Coming soon", "Edit Profile screen can be added next.")}
          />

          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="View booking updates"
            onPress={() => router.push("notifications")}
          />

          <MenuItem
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            subtitle="Manage your account security"
            onPress={() => Alert.alert("Coming soon", "Privacy settings can be added next.")}
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Session</Text>

          <MenuItem
            icon="log-out-outline"
            title="Sign Out"
            subtitle="Logout from this account"
            onPress={handleLogout}
            danger
          />

          <Text style={styles.versionText}>Ceylon Mate v1.0.0</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },

  // Header
  header: {
    paddingTop: 58,
    paddingBottom: 26,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },

  profileInfo: { alignItems: "center", marginTop: 10 },

  avatar: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },

  name: { marginTop: 12, fontSize: 20, fontWeight: "700", color: "#fff" },
  email: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: "400" },

  badge: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  badgeFlag: { color: "#fff", fontSize: 12 },

  // Content
  content: { padding: 16 },

  sectionTitle: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginBottom: 10, marginTop: 10 },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    marginBottom: 10,
  },
  menuItemDanger: { borderColor: "#FAD1D5" },

  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuIconBoxDanger: { backgroundColor: "#FDECEC" },

  menuTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  menuSubtitle: { marginTop: 2, fontSize: 12, color: "#6B7280", fontWeight: "400" },

  divider: { height: 1, backgroundColor: "#EEF2F7", marginVertical: 14 },

  versionText: { textAlign: "center", color: "#9CA3AF", fontSize: 12, marginTop: 18, fontWeight: "400" },
});