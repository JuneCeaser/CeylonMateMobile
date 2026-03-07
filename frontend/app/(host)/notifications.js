import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/theme";

export default function NotificationsScreen() {
  const router = useRouter();

  const notifications = useMemo(() => [], []);
  const hasItems = notifications.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.primary, Colors.primary]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.roundBackBtn} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={22} color={Colors.surface} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>Important updates</Text>
          </View>

          <TouchableOpacity onPress={() => {}} style={styles.headerAction} activeOpacity={0.85} disabled>
            <Ionicons name="checkmark-done" size={20} color={"rgba(255,255,255,0.6)"} />
          </TouchableOpacity>
        </View>

        {/* Info pill */}
        <View style={styles.infoPill}>
          <Ionicons name="notifications-outline" size={14} color={Colors.primary} />
          <Text style={styles.infoText}>Your recent updates will appear here.</Text>
        </View>
      </LinearGradient>

      {/* Body */}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!hasItems ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={34} color={Colors.textSecondary} />
            </View>

            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              When important updates arrive, you will see them here.
            </Text>

            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push("ai-questions")}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles-outline" size={18} color={Colors.surface} />
                <Text style={styles.primaryBtnText}>Go to AI Questions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push("manage-culture")}
                activeOpacity={0.85}
              >
                <Ionicons name="grid-outline" size={18} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ paddingTop: 8 }}>
            {/* Future notifications list */}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingTop: 62, paddingBottom: 16, paddingHorizontal: 16 },

  headerTop: { flexDirection: "row", alignItems: "center" },

  roundBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },

  title: { fontSize: 20, fontWeight: "700", color: Colors.surface },

  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontWeight: "400",
  },

  headerAction: { padding: 6 },

  infoPill: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  infoText: { fontSize: 12, color: Colors.text, fontWeight: "400" },

  body: { flexGrow: 1, padding: 16 },

  emptyWrap: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },

  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 18,
  },

  ctaRow: {
    marginTop: 14,
    width: "100%",
    rowGap: 10,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: "center",
  },

  primaryBtnText: {
    color: Colors.surface,
    fontWeight: "700",
    fontSize: 13,
  },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  secondaryBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
});