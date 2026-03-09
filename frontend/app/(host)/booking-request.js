import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../constants/api";
import { Colors } from "../../constants/theme";

export default function BookingRequestsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const router = useRouter();

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/bookings/host/list");
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
      Alert.alert("Error", "Could not refresh bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    if (activeTab === "history") {
      return bookings.filter((b) => b.status !== "pending" && b.status !== "confirmed");
    }

    return bookings.filter((b) => b.status === activeTab);
  }, [bookings, activeTab]);

  const handleAction = async (id, status) => {
    const actionLabel = status === "confirmed" ? "Accept" : "Decline";

    Alert.alert(`${actionLabel} Request`, `Proceed with this action?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await api.patch(`/bookings/update-status/${id}`, { status });
            fetchBookings();
          } catch (err) {
            Alert.alert(
              "Error",
              err?.response?.data?.error || "Failed to update booking."
            );
          }
        },
      },
    ]);
  };

  const getStatusTheme = (status) => {
    switch (status) {
      case "pending":
        return {
          color: "#A16207",
          icon: "clock-outline",
          bg: "#FEF3C7",
          label: "Pending",
        };
      case "confirmed":
        return {
          color: "#2E7D32",
          icon: "check-decagram",
          bg: "#E8F5E9",
          label: "Accepted",
        };
      case "completed":
        return {
          color: "#1565C0",
          icon: "flag-checkered",
          bg: "#E3F2FD",
          label: "Completed",
        };
      case "cancelled_by_host":
        return {
          color: "#D32F2F",
          icon: "close-octagon",
          bg: "#FFEBEE",
          label: "Cancelled by Host",
        };
      case "cancelled_by_tourist":
        return {
          color: "#D32F2F",
          icon: "account-cancel",
          bg: "#FFEBEE",
          label: "Cancelled by Tourist",
        };
      case "cancelled":
        return {
          color: "#D32F2F",
          icon: "close-circle",
          bg: "#FFEBEE",
          label: "Cancelled",
        };
      default:
        return {
          color: "#757575",
          icon: "history",
          bg: "#F5F5F5",
          label: "Past Booking",
        };
    }
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const formatTime = (item) => {
    if (item?.requestedTime) return item.requestedTime;

    try {
      return new Date(item.bookingDate).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const renderItem = ({ item }) => {
    const theme = getStatusTheme(item.status);
    const firstLetter = (item.touristName || "T").charAt(0).toUpperCase();
    const guestsCount = Number(item.guests) || 0;
    const guestsText = `${guestsCount} ${guestsCount === 1 ? "Guest" : "Guests"}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.touristName} numberOfLines={1}>
              {item.touristName || "Tourist"}
            </Text>
            <Text style={styles.expTitle} numberOfLines={1}>
              {item.experience?.title || "Experience"}
            </Text>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons
                name="calendar-clear-outline"
                size={15}
                color={Colors.primary}
              />
              <Text style={styles.infoText}>{formatDate(item.bookingDate)}</Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={15} color="#2563EB" />
              <Text style={styles.infoText}>{formatTime(item)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={15} color="#6B7280" />
              <Text style={styles.infoText}>{guestsText}</Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={15} color="#2E7D32" />
              <Text style={styles.priceText}>
                LKR {(Number(item.totalPrice) || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {item.status === "pending" ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.flexBtn, styles.declineBtn]}
              onPress={() => handleAction(item._id, "cancelled")}
              activeOpacity={0.85}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.flexBtn, styles.acceptBtn]}
              onPress={() => handleAction(item._id, "confirmed")}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: theme.bg, borderColor: theme.bg },
            ]}
          >
            <MaterialCommunityIcons
              name={theme.icon}
              size={14}
              color={theme.color}
            />
            <Text style={[styles.statusText, { color: theme.color }]}>
              {theme.label}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1B5E20", "#0A2A0C"]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.roundBackBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          <View style={styles.titleContent}>
            <Text style={styles.title}>Bookings</Text>
            <Text style={styles.subtitle}>Management Portal</Text>
          </View>

          <TouchableOpacity
            onPress={fetchBookings}
            style={styles.refreshIcon}
            activeOpacity={0.85}
          >
            <Ionicons
              name="sync"
              size={20}
              color="rgba(255,255,255,0.85)"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.tabContainer}>
        {["pending", "confirmed", "history"].map((tab) => {
          const isActive = activeTab === tab;

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, isActive && styles.activeTabItem]}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {isActive && <View style={styles.tabDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No bookings in this section</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },

  header: {
    paddingTop: 62,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  roundBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContent: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontWeight: "400",
  },
  refreshIcon: {
    padding: 6,
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -22,
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeTabItem: {
    backgroundColor: "#F1F8F1",
    borderWidth: 1,
    borderColor: "#CDE7CD",
  },
  tabLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeTabLabel: {
    color: Colors.primary,
    fontWeight: "600",
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },

  list: {
    padding: 16,
    paddingTop: 22,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF6EE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CDE7CD",
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },

  nameContainer: {
    flex: 1,
    marginLeft: 12,
  },
  touristName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  expTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "400",
  },

  infoBlock: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  priceText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },

  actionRow: {
    flexDirection: "row",
    columnGap: 12,
    marginTop: 12,
  },
  flexBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  acceptBtn: {
    backgroundColor: "#EAF6EE",
    borderColor: "#CDE7CD",
  },
  declineBtn: {
    backgroundColor: "#FDECEC",
    borderColor: "#F5C2C7",
  },
  acceptText: {
    color: "#2E7D32",
    fontSize: 13,
    fontWeight: "600",
  },
  declineText: {
    color: "#D32F2F",
    fontSize: 13,
    fontWeight: "600",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 12,
    borderRadius: 12,
    columnGap: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 40,
    fontSize: 13,
    fontWeight: "400",
  },
});