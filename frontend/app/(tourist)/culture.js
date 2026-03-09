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

const GREEN = "#2E7D32";
const DARK_GREEN = "#1B5E20";
const BG = "#F6F8F7";

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
      "https://via.placeholder.com/300x300";

    const safePrice = Number(item?.price || 0);
    const safeRating = Number(item?.rating || 0);

    return (
      <TouchableOpacity
        style={styles.card}
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

          {!!item?.vrPreview?.url && (
            <View style={styles.vrBadge}>
              <Ionicons name="glasses-outline" size={12} color="#fff" />
              <Text style={styles.vrBadgeText}>360</Text>
            </View>
          )}

          <View style={styles.categoryOverlay}>
            <Text style={styles.categoryOverlayText} numberOfLines={1}>
              {(item?.category || "Experience").toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.contentBox}>
          <View style={styles.topContent}>
            <View style={styles.titleRow}>
              <Text style={styles.titleMain} numberOfLines={2}>
                {item?.title || "Untitled Experience"}
              </Text>

              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {safeRating > 0 ? safeRating.toFixed(1) : "New"}
                </Text>
              </View>
            </View>

            <View style={styles.hostRow}>
              <Ionicons name="person-circle-outline" size={15} color={GREEN} />
              <Text style={styles.hostNameText} numberOfLines={1}>
                Hosted by {item?.hostName || "Local Guide"}
              </Text>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.priceWrap}>
              <Text style={styles.priceHead}>Price per guest</Text>
              <Text style={styles.priceValText}>
                LKR {safePrice.toLocaleString()}
              </Text>
            </View>

            <View style={styles.exploreBtn}>
              <Text style={styles.exploreBtnText}>Explore</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[GREEN, DARK_GREEN]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.headerTitle}>Culture Hub</Text>
            <Text style={styles.headerSubtitle}>
              Discover authentic Sri Lankan traditions 🇱🇰
            </Text>
          </View>

          <TouchableOpacity
            style={styles.bookIcon}
            onPress={() => router.push("/(tourist)/my-bookings")}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={24} color="#FFF" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search experiences..."
            placeholderTextColor="#9CA3AF"
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
            activeOpacity={0.85}
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
              activeOpacity={0.85}
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
        <ActivityIndicator size="large" color={GREEN} style={{ marginTop: 50 }} />
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
              tintColor={GREEN}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="leaf-outline" size={34} color="#9CA3AF" />
              </View>
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
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    paddingTop: 58,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },

  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    marginTop: 4,
  },

  bookIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F59E0B",
    borderWidth: 1.5,
    borderColor: DARK_GREEN,
  },

  searchWrapper: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 54,
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#111827",
  },

  filterSection: {
    marginTop: 12,
    marginBottom: 6,
  },

  chipScroll: {
    paddingHorizontal: 20,
    paddingRight: 30,
  },

  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#FFF",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  activeChip: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  chipText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
  },

  activeChipText: {
    color: "#FFF",
  },

  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 4,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 14,
    height: 175,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF1EF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  imageBox: {
    width: 128,
    height: "100%",
    position: "relative",
    backgroundColor: "#E5E7EB",
  },

  thumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  vrBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46,125,50,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  vrBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },

  categoryOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },

  categoryOverlayText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.7,
  },

  contentBox: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },

  topContent: {
    flexShrink: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  titleMain: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 21,
    marginRight: 8,
  },

  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3FAF4",
    borderWidth: 1,
    borderColor: "#DCEEDD",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },

  ratingText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: GREEN,
  },

  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  hostNameText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginLeft: 5,
    flex: 1,
  },

  bottomSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 8,
  },

  priceWrap: {
    flex: 1,
    paddingRight: 8,
  },

  priceHead: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 3,
    fontWeight: "500",
  },

  priceValText: {
    fontSize: 12,
    fontWeight: "900",
    color: GREEN,
  },

  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 14,
  },

  exploreBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    marginRight: 4,
  },

  emptyBox: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 34,
    paddingHorizontal: 20,
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#EEF1EF",
  },

  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },
});