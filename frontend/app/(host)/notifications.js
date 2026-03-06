import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/theme";

export default function NotificationsScreen() {
  const router = useRouter();

  // Later replace with API data:
  // Suggested notification types:
  // - AI: new unanswered questions, verified QA saved
  // - Booking updates (non-request): cancelled, completed, rescheduled
  // - System: payouts, verification, approvals
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
            <Text style={styles.subtitle}>AI updates & important alerts</Text>
          </View>

          {/* Optional future action: mark all read */}
          <TouchableOpacity onPress={() => {}} style={styles.headerAction} activeOpacity={0.85} disabled>
            <Ionicons name="checkmark-done" size={20} color={"rgba(255,255,255,0.6)"} />
          </TouchableOpacity>
        </View>

        {/* Info pill */}
        <View style={styles.infoPill}>
          <Ionicons name="sparkles-outline" size={14} color={Colors.primary} />
          <Text style={styles.infoText}>AI alerts, cancellations, and system updates appear here.</Text>
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
              When you receive AI questions, booking cancellations, or important system alerts, you’ll see them here.
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

            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.hintText}>
                Booking requests are managed in <Text style={styles.hintStrong}>Bookings</Text>, not here.
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ paddingTop: 8 }}>
            {/* When you add API, render notifications list here */}
            {/* Example UI idea:
                - AI notification card
                - cancellation card
                - system card
            */}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
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

  // Body
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

  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: "700", color: Colors.text },

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
  primaryBtnText: { color: Colors.surface, fontWeight: "700", fontSize: 13 },

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
  secondaryBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 13 },

  hintBox: {
    marginTop: 14,
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 8,
    backgroundColor: Colors.primary + "10",
    borderWidth: 1,
    borderColor: Colors.primary + "20",
    padding: 12,
    borderRadius: 14,
  },
  hintText: { flex: 1, color: Colors.text, fontSize: 12, lineHeight: 18, fontWeight: "400" },
  hintStrong: { fontWeight: "700", color: Colors.text },
});