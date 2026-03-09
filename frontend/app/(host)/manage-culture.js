// app/(host)/manage-culture.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "../../constants/api";
import { Colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

const ORANGE = "#F59E0B";
const HEADER_HEIGHT = 250;

export default function ManageCulture() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [experiences, setExperiences] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [unansweredCount, setUnansweredCount] = useState(0);

  const profileInitial = (userProfile?.name || "H").trim().charAt(0).toUpperCase();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const expRes = await api.get("/experiences/my/list");
      const myExps = Array.isArray(expRes.data) ? expRes.data : [];

      const bookRes = await api.get("/bookings/host/list");
      const myBookings = Array.isArray(bookRes.data) ? bookRes.data : [];

      let totalUnknowns = 0;

      for (const exp of myExps) {
        try {
          const unknownRes = await api.get(`/assistant/unknown/${exp._id}`);
          const unknownList = Array.isArray(unknownRes.data) ? unknownRes.data : [];

          const filteredList = unknownList.filter(
            (item) => !item?.type || item.type === "NEEDS_HOST"
          );

          totalUnknowns += filteredList.length;
        } catch (err) {
          console.log(
            "Unknown fetch failed for experience:",
            exp?._id,
            err?.response?.data || err?.message
          );
        }
      }

      setExperiences(myExps);
      setBookings(myBookings);
      setUnansweredCount(totalUnknowns);
    } catch (e) {
      console.log("Host dashboard load error:", e?.response?.data || e.message);
      setExperiences([]);
      setBookings([]);
      setUnansweredCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;

  const earnings = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

  const earningsText =
    earnings >= 1000 ? `${(earnings / 1000).toFixed(1)}k` : String(earnings);

  const confirmDelete = (exp) => {
    Alert.alert("Delete Experience", `Delete "${exp?.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/experiences/delete/${exp._id}`);
            loadData();
          } catch (err) {
            Alert.alert("Error", err?.response?.data?.error || "Delete failed.");
          }
        },
      },
    ]);
  };

  const ActionRow = ({ icon, iconWrapStyle, title, sub, badge, onPress }) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.88}>
      <View style={[styles.actionIconWrap, iconWrapStyle]}>
        <Ionicons name={icon} size={20} color={Colors.surface} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.actionTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.actionSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>

      {typeof badge === "number" && badge > 0 ? (
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : String(badge)}</Text>
        </View>
      ) : null}

      <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  const ExperienceCompactCard = ({ exp }) => {
    const imageUrl = exp.images?.[0] || "https://via.placeholder.com/300x300";
    const cat = (exp.category || "EXPERIENCE").toUpperCase();
    const priceNum = Number(exp.price) || 0;
    const priceText = `LKR ${priceNum.toLocaleString()}`;

    const goEdit = () =>
      router.push({ pathname: "add-culture", params: { editId: exp._id } });

    return (
      <TouchableOpacity activeOpacity={0.92} onPress={goEdit} style={styles.expCard}>
        <View style={styles.expImgWrap}>
          <Image source={{ uri: imageUrl }} style={styles.expImg} resizeMode="cover" />
        </View>

        <View style={styles.expMid}>
          <Text style={styles.expCategory} numberOfLines={1}>
            {cat}
          </Text>
          <Text style={styles.expTitle} numberOfLines={2}>
            {exp.title}
          </Text>
          <Text style={styles.expPrice} numberOfLines={1}>
            {priceText}
          </Text>
        </View>

        <View style={styles.expDivider} />

        <View style={styles.expActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={goEdit}
            activeOpacity={0.9}
          >
            <Ionicons name="create-outline" size={18} color={Colors.success} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => confirmDelete(exp)}
            activeOpacity={0.9}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderExp = ({ item }) => <ExperienceCompactCard exp={item} />;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, Colors.success]} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Ayubowan 🙏</Text>
            <Text style={styles.name}>{userProfile?.name || "Host"}</Text>
            <Text style={styles.subtitle}>Your Smart Host Hub</Text>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => router.push("notifications")}
              style={styles.headerIconBtn}
              activeOpacity={0.85}
            >
              <View style={{ position: "relative" }}>
                <Ionicons name="notifications" size={22} color={Colors.surface} />
                {pendingCount > 0 ? <View style={styles.badgeDot} /> : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("profile")}
              style={styles.headerIconBtn}
              activeOpacity={0.85}
            >
              {userProfile?.profileImage ? (
                <Image
                  source={{ uri: userProfile.profileImage }}
                  style={styles.headerProfileImage}
                />
              ) : (
                <View style={styles.headerProfileFallback}>
                  <Text style={styles.headerProfileFallbackText}>{profileInitial}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.kpiWrap}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{experiences.length}</Text>
            <Text style={styles.kpiLabel}>Listings</Text>
          </View>

          <View style={styles.kpiDivider} />

          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: Colors.secondary }]}>{earningsText}</Text>
            <Text style={styles.kpiLabel}>Earnings</Text>
          </View>

          <View style={styles.kpiDivider} />

          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: Colors.accent }]}>{confirmedCount}</Text>
            <Text style={styles.kpiLabel}>Confirmed</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.body}>
          <Text style={styles.sectionTitleStrong}>Quick Actions</Text>

          <View style={styles.actionsCard}>
            <ActionRow
              icon="mail"
              iconWrapStyle={{ backgroundColor: Colors.primary }}
              title="Booking Requests"
              sub={`${pendingCount} new inquiries to handle`}
              badge={pendingCount}
              onPress={() => router.push("booking-request")}
            />
            <View style={styles.rowDivider} />

            <ActionRow
              icon="sparkles"
              iconWrapStyle={styles.aiIconWrap}
              title="AI Questions"
              sub={`${unansweredCount} unanswered questions`}
              badge={unansweredCount}
              onPress={() => router.push("ai-questions")}
            />
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitleStrong}>My Experiences</Text>
              <Text style={styles.sectionMeta}>{experiences.length} items listed</Text>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push("add-culture")}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={Colors.surface} />
              <Text style={styles.addBtnText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 20 }} />
          ) : experiences.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="file-tray" size={30} color={Colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No experiences yet</Text>
              <Text style={styles.emptyText}>Tap “Add New” to create your first listing.</Text>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <FlatList
                key="exp-list-1col"
                data={experiences}
                keyExtractor={(x) => String(x._id)}
                renderItem={renderExp}
                scrollEnabled={false}
                numColumns={1}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    paddingTop: 58,
    paddingBottom: 16,
    paddingHorizontal: 18,
    height: HEADER_HEIGHT,
  },

  scrollContent: {
    paddingTop: HEADER_HEIGHT - 18,
    paddingBottom: 20,
  },

  headerRow: { flexDirection: "row", alignItems: "center" },

  greeting: { color: Colors.surface, fontSize: 14, fontWeight: "500" },
  name: { color: Colors.surface, fontSize: 28, fontWeight: "700", marginTop: 2 },
  subtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
  },

  headerIcons: { flexDirection: "row", alignItems: "center", columnGap: 12 },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  headerProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  headerProfileFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerProfileFallbackText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  badgeDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.primary,
  },

  kpiWrap: {
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiItem: { flex: 1, alignItems: "center" },
  kpiValue: { fontSize: 20, fontWeight: "600", color: Colors.text },
  kpiLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: "500" },
  kpiDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  body: { paddingHorizontal: 16, paddingTop: 40 },

  sectionTitleStrong: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  sectionMeta: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },

  actionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  rowDivider: { height: 1, backgroundColor: Colors.border },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionTitle: { fontSize: 15, fontWeight: "600", color: Colors.text },
  actionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, fontWeight: "500" },

  aiIconWrap: {
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  badgePill: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 10,
    minWidth: 34,
    alignItems: "center",
  },
  badgeText: { color: Colors.surface, fontWeight: "700", fontSize: 12 },

  sectionHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  addBtnText: { color: Colors.surface, fontWeight: "600", fontSize: 13 },

  expCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    minHeight: 88,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  expImgWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.background,
  },
  expImg: { width: "100%", height: "100%" },

  expMid: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: "center",
    paddingRight: 10,
  },

  expCategory: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 2,
  },

  expTitle: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "700",
    lineHeight: 18,
  },

  expPrice: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.secondary,
  },

  expDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },

  expActions: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    rowGap: 10,
    paddingLeft: 10,
  },

  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  editBtn: {
    backgroundColor: Colors.success + "12",
    borderColor: Colors.success + "22",
  },

  deleteBtn: {
    backgroundColor: Colors.danger + "12",
    borderColor: Colors.danger + "22",
  },

  emptyBox: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: "600", color: Colors.text },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },
});