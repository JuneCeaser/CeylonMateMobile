// frontend/app/(tourist)/culture.js

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "../../constants/api";

export default function CultureScreen() {
  const router = useRouter();

  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const categories = ["Cooking", "Farming", "Handicraft", "Fishing", "Dancing"];

  const fetchExperiences = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let url = `/experiences?search=${encodeURIComponent(searchQuery || "")}`;
        if (selectedCategory) {
          url += `&category=${encodeURIComponent(selectedCategory)}`;
        }

        const response = await api.get(url);
        setExperiences(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error(
          "Fetch experiences error:",
          error?.response?.data || error?.message || error
        );
        setExperiences([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, selectedCategory]
  );

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  const renderExperienceCard = ({ item }) => {
    const coverImage =
      item?.images?.[0] ||
      item?.vrPreview?.url ||
      "https://via.placeholder.com/150";

    const safePrice = Number(item?.price || 0);
    const safeRating = Number(item?.rating || 0);

    return (
      <TouchableOpacity
        style={styles.ultraCompactCard}
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: "/(tourist)/experience-detail",
            params: { id: item._id },
          })
        }
      >
        <View style={styles.imageBox}>
          <Image source={{ uri: coverImage }} style={styles.thumbImage} />

          <View style={styles.miniCategory}>
            <Text style={styles.miniCategoryText}>
              {item?.category || "Experience"}
            </Text>
          </View>

          {!!item?.vrPreview?.url && (
            <View style={styles.vrMiniBadge}>
              <Ionicons name="glasses-outline" size={10} color="#fff" />
              <Text style={styles.vrMiniBadgeText}>360</Text>
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <View>
            <View style={styles.topRow}>
              <Text style={styles.titleMain} numberOfLines={2}>
                {item?.title || "Untitled Experience"}
              </Text>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={10} color="#FFA000" />
                <Text style={styles.ratingVal}>
                  {safeRating > 0 ? safeRating.toFixed(1) : "New"}
                </Text>
              </View>
            </View>

            <View style={styles.hostRow}>
              <Ionicons name="person-circle-outline" size={14} color="#2E7D32" />
              <Text style={styles.hostNameText} numberOfLines={1}>
                Hosted by {item?.hostName || "Local Guide"}
              </Text>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <View>
              <Text style={styles.priceHead}>Price per guest</Text>
              <Text style={styles.priceValText}>LKR {safePrice.toLocaleString()}</Text>
            </View>

            <View style={styles.insightBtn}>
              <Text style={styles.insightBtnText}>Explore</Text>
              <Ionicons name="chevron-forward" size={13} color="#FFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#2E7D32", "#1B5E20"]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Culture Hub</Text>
            <Text style={styles.headerSubtitle}>
              Discover authentic Sri Lankan traditions 🇱🇰
            </Text>
          </View>

          <TouchableOpacity
            style={styles.bookIcon}
            onPress={() => router.push("/(tourist)/my-bookings")}
          >
            <Ionicons name="calendar-outline" size={24} color="#FFF" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search experiences..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          <TouchableOpacity
            style={[styles.chip, !selectedCategory && styles.activeChip]}
            onPress={() => setSelectedCategory("")}
          >
            <Text style={[styles.chipText, !selectedCategory && styles.activeChipText]}>
              All
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.activeChip]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === cat && styles.activeChipText,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={experiences}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderExperienceCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchExperiences(true)}
              tintColor="#2E7D32"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="leaf-outline" size={34} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No experiences found</Text>
              <Text style={styles.emptyText}>
                Try another category or search keyword.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },

  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)" },

  bookIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 10,
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F57C00",
    borderWidth: 1.5,
    borderColor: "#1B5E20",
  },

  searchWrapper: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    alignItems: "center",
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },

  filterSection: { marginVertical: 12 },
  chipScroll: { paddingHorizontal: 20 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFF",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  activeChip: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  chipText: { color: "#666", fontSize: 12, fontWeight: "600" },
  activeChipText: { color: "#FFF" },

  listContainer: { paddingHorizontal: 20, paddingBottom: 30 },

  ultraCompactCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 15,
    marginBottom: 12,
    minHeight: 118,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    overflow: "hidden",
  },

  imageBox: { width: 115, minHeight: 118, position: "relative" },
  thumbImage: { width: "100%", height: "100%", resizeMode: "cover" },

  miniCategory: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 3,
  },
  miniCategoryText: {
    color: "#FFF",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },

  vrMiniBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46,125,50,0.95)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 3,
  },
  vrMiniBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },

  textContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleMain: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    flex: 1,
    marginRight: 6,
    lineHeight: 18,
  },

  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  hostNameText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
    fontStyle: "italic",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#F0F7F0",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingVal: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#2E7D32",
  },

  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  priceHead: {
    fontSize: 9,
    color: "#999",
    marginBottom: -1,
  },
  priceValText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2E7D32",
  },

  insightBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2E7D32",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 11,
    gap: 4,
    minHeight: 34,
  },
  insightBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  emptyBox: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginTop: 30,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
});