import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../constants/api";
import { Colors } from "../../constants/theme";

const { width } = Dimensions.get("window");

const getIntentConfig = (intent) => {
  switch (String(intent || "OTHER").toUpperCase()) {
    case "WHY":
      return { color: "#7B1FA2", bg: "#F3E5F5", icon: "help-circle", label: "Why" };
    case "HOW":
      return { color: "#1565C0", bg: "#E3F2FD", icon: "construct", label: "How" };
    case "WHAT":
      return { color: "#E65100", bg: "#FFF3E0", icon: "information-circle", label: "What" };
    case "WHERE":
      return { color: "#00695C", bg: "#E0F2F1", icon: "location", label: "Where" };
    case "WHEN":
      return { color: "#F57C00", bg: "#FFF8E1", icon: "time", label: "When" };
    case "WHO":
      return { color: "#AD1457", bg: "#FCE4EC", icon: "person", label: "Who" };
    case "RULES":
      return { color: "#D32F2F", bg: "#FFEBEE", icon: "shield-checkmark", label: "Rules" };
    case "WHICH":
      return { color: "#4338CA", bg: "#EEF2FF", icon: "list", label: "Which" };
    default:
      return { color: "#546E7A", bg: "#ECEFF1", icon: "chatbubble", label: "Other" };
  }
};

const getActionConfig = (action) => {
  switch (String(action || "").toUpperCase()) {
    case "ANSWER":
      return {
        color: "#2E7D32",
        bg: "#E8F5E9",
        label: "Answered",
        icon: "checkmark-circle",
      };
    case "CLARIFY":
      return {
        color: "#F57C00",
        bg: "#FFF3E0",
        label: "Clarify",
        icon: "help-circle",
      };
    case "REFUSE":
      return {
        color: "#D32F2F",
        bg: "#FFEBEE",
        label: "Refused",
        icon: "close-circle",
      };
    default:
      return {
        color: "#546E7A",
        bg: "#ECEFF1",
        label: "Unknown",
        icon: "ellipse",
      };
  }
};

const getRouteConfig = (route) => {
  switch (String(route || "").toUpperCase()) {
    case "VERIFIED_QA":
      return {
        label: "Verified Answer",
        shortLabel: "Verified",
        color: "#2E7D32",
        bg: "#E8F5E9",
        icon: "shield-checkmark",
      };
    case "EXPERIENCE":
      return {
        label: "Experience Knowledge",
        shortLabel: "AI Knowledge",
        color: "#1565C0",
        bg: "#E3F2FD",
        icon: "book",
      };
    case "NONE":
      return {
        label: "No Answer Source",
        shortLabel: "No Source",
        color: "#D32F2F",
        bg: "#FFEBEE",
        icon: "close-circle",
      };
    default:
      return {
        label: "Unknown Source",
        shortLabel: "Unknown",
        color: "#546E7A",
        bg: "#ECEFF1",
        icon: "help-circle",
      };
  }
};

const getConfidenceColor = (confidence) => {
  if (confidence >= 0.75) return "#2E7D32";
  if (confidence >= 0.5) return "#F57C00";
  return "#D32F2F";
};

export default function QAHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const experienceId = params?.experienceId;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);

  const handleBackPress = () => {
    if (experienceId) {
      router.push({
        pathname: "/(tourist)/experience-detail",
        params: { id: experienceId },
      });
    } else {
      router.push("/(tourist)/culture");
    }
  };

  const filters = [
    { key: "ALL", label: "All", icon: "list" },
    { key: "ANSWER", label: "Answered", icon: "checkmark-circle" },
    { key: "CLARIFY", label: "Clarify", icon: "help-circle" },
    { key: "REFUSE", label: "Refused", icon: "close-circle" },
  ];

  const fetchHistory = async () => {
    try {
      const res = await api.get("/assistant/history");
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setLogs(data);
    } catch (error) {
      console.error("Q&A history fetch error:", error?.message || error);
      Alert.alert("Error", "Could not load your Q&A history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (activeFilter === "ALL") return true;
      return String(log.action || "").toUpperCase() === activeFilter;
    });
  }, [logs, activeFilter]);

  const handleShareQA = async (log) => {
    try {
      const confidencePct = Math.round((log.confidence || 0) * 100);
      const routeText = getRouteConfig(log.route).label;
      const actionText = getActionConfig(log.action).label;
      const verifierText =
        log.verifier && log.verifier !== "SKIPPED"
          ? `\nVerifier: ${log.verifier}`
          : "";

      const shareText =
        `CeylonMate Cultural Q&A\n\n` +
        `Question:\n"${log.question}"\n\n` +
        `Answer:\n${log.answer}\n\n` +
        `Status: ${actionText}\n` +
        `Confidence: ${confidencePct}%\n` +
        `Source: ${routeText}${verifierText}\n\n` +
        `#CeylonMate #SriLanka #CulturalLearning`;

      await Share.share({ message: shareText });
    } catch (error) {
      Alert.alert("Error", "Could not share this Q&A.");
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      "  •  " +
      d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const renderQACard = ({ item, index }) => {
    const intentCfg = getIntentConfig(item.intent);
    const actionCfg = getActionConfig(item.action);
    const routeCfg = getRouteConfig(item.route);
    const confColor = getConfidenceColor(item.confidence || 0);
    const confPct = Math.round((item.confidence || 0) * 100);
    const isExpanded = expandedId === item._id;
    const verifier = String(item.verifier || "SKIPPED").toUpperCase();

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => toggleExpand(item._id)}
        activeOpacity={0.92}
      >
        <View style={styles.cardHeader}>
          <View style={styles.indexCircle}>
            <Text style={styles.indexText}>{filteredLogs.length - index}</Text>
          </View>

          <View style={styles.badgesRow}>
            <View style={[styles.intentBadge, { backgroundColor: intentCfg.bg }]}>
              <Ionicons name={intentCfg.icon} size={11} color={intentCfg.color} />
              <Text style={[styles.intentText, { color: intentCfg.color }]}>
                {intentCfg.label}
              </Text>
            </View>

            <View style={[styles.actionBadge, { backgroundColor: actionCfg.bg }]}>
              <Ionicons name={actionCfg.icon} size={11} color={actionCfg.color} />
              <Text style={[styles.actionText, { color: actionCfg.color }]}>
                {actionCfg.label}
              </Text>
            </View>
          </View>

          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="#CCC"
          />
        </View>

        <View style={styles.questionRow}>
          <MaterialCommunityIcons name="microphone" size={16} color="#FFA000" />
          <Text style={styles.questionText} numberOfLines={isExpanded ? 0 : 2}>
            {item.question}
          </Text>
        </View>

        <View
          style={[
            styles.answerBox,
            item.action === "REFUSE" && styles.answerBoxRefuse,
            item.action === "CLARIFY" && styles.answerBoxClarify,
          ]}
        >
          <Text
            style={[
              styles.answerText,
              item.action === "REFUSE" && styles.answerTextRefuse,
              item.action === "CLARIFY" && styles.answerTextClarify,
            ]}
            numberOfLines={isExpanded ? 0 : 3}
          >
            {item.answer}
          </Text>
        </View>

        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.metaBlock}>
              <View style={styles.metaLabelRow}>
                <Ionicons name="analytics" size={14} color={confColor} />
                <Text style={[styles.metaLabel, { color: confColor }]}>
                  Confidence — {confPct}%
                </Text>
              </View>

              <View style={styles.confBarBg}>
                <View
                  style={[
                    styles.confBarFill,
                    {
                      width: `${confPct}%`,
                      backgroundColor: confColor,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaCard}>
                <Text style={styles.metaDetailLabel}>Source</Text>
                <View style={[styles.routePill, { backgroundColor: routeCfg.bg }]}>
                  <Ionicons name={routeCfg.icon} size={13} color={routeCfg.color} />
                  <Text style={[styles.routePillText, { color: routeCfg.color }]}>
                    {routeCfg.shortLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.metaDetailLabel}>Intent</Text>
                <Text style={styles.metaDetailValue}>{intentCfg.label}</Text>
              </View>
            </View>

            {verifier !== "SKIPPED" && (
              <View style={styles.metaBlock}>
                <Text style={styles.metaDetailLabel}>Verifier</Text>
                <Text
                  style={[
                    styles.metaDetailValue,
                    {
                      color: verifier === "SUPPORTED" ? "#2E7D32" : "#D32F2F",
                    },
                  ]}
                >
                  {verifier === "SUPPORTED"
                    ? "Supported by evidence"
                    : "Not fully supported"}
                </Text>
              </View>
            )}

            <View style={styles.metaBlock}>
              <Text style={styles.metaDetailLabel}>Asked on</Text>
              <Text style={styles.metaDetailValue}>{formatDate(item.createdAt)}</Text>
            </View>

            {(item.action === "ANSWER" || item.action === "CLARIFY") && (
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => handleShareQA(item)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.primary, "#1B5E20"]}
                  style={styles.shareBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="share-social" size={16} color="white" />
                  <Text style={styles.shareBtnText}>Share This Q&A</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.footerDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.tapHint}>
            {isExpanded ? "Tap to collapse" : "Tap to expand"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="microphone-off" size={64} color="#DDD" />
      <Text style={styles.emptyTitle}>No Questions Yet</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === "ALL"
          ? "You have not asked the Cultural AI Assistant anything yet.\nBook an experience and try the voice assistant."
          : activeFilter === "CLARIFY"
          ? "No clarification items found."
          : `No ${activeFilter.toLowerCase()} items found.`}
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => router.push("/(tourist)/culture")}
      >
        <Text style={styles.emptyBtnText}>Explore Experiences</Text>
      </TouchableOpacity>
    </View>
  );

  const answeredCount = logs.filter((l) => String(l.action).toUpperCase() === "ANSWER").length;
  const clarifyCount = logs.filter((l) => String(l.action).toUpperCase() === "CLARIFY").length;
  const refusedCount = logs.filter((l) => String(l.action).toUpperCase() === "REFUSE").length;
  const avgConfidence =
    logs.length > 0
      ? Math.round(
          (logs.reduce((sum, l) => sum + Number(l.confidence || 0), 0) / logs.length) * 100
        )
      : 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1B5E20", "#2E7D32"]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>My Q&A History</Text>
            <Text style={styles.headerSubtitle}>{logs.length} questions asked</Text>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => {
              setRefreshing(true);
              fetchHistory();
            }}
          >
            <Ionicons name="sync" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{logs.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
              {answeredCount}
            </Text>
            <Text style={styles.statLabel}>Answered</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#F57C00" }]}>
              {clarifyCount}
            </Text>
            <Text style={styles.statLabel}>Clarify</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#EF5350" }]}>
              {refusedCount}
            </Text>
            <Text style={styles.statLabel}>Refused</Text>
          </View>
        </View>

        <View style={styles.avgConfidenceCard}>
          <Ionicons name="analytics-outline" size={18} color="#FFA000" />
          <Text style={styles.avgConfidenceText}>
            Average confidence: {avgConfidence}%
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              activeFilter === f.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Ionicons
              name={f.icon}
              size={14}
              color={activeFilter === f.key ? Colors.primary : "#AAA"}
            />
            <Text
              style={[
                styles.filterTabText,
                activeFilter === f.key && styles.filterTabTextActive,
              ]}
            >
              {f.label}
            </Text>

            <View
              style={[
                styles.filterCountBadge,
                activeFilter === f.key && styles.filterCountBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.filterCountText,
                  activeFilter === f.key && styles.filterCountTextActive,
                ]}
              >
                {f.key === "ALL"
                  ? logs.length
                  : logs.filter((l) => String(l.action).toUpperCase() === f.key).length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            Loading your cultural conversations...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderQACard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleBlock: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
  },

  statsCard: {
    backgroundColor: "white",
    borderRadius: 16,
    flexDirection: "row",
    paddingVertical: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 4,
  },

  avgConfidenceCard: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avgConfidenceText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    flexWrap: "wrap",
  },
  filterTab: {
    minWidth: "22%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1.5,
    borderColor: "#EEEEEE",
    elevation: 1,
  },
  filterTabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#AAA",
  },
  filterTabTextActive: {
    color: Colors.primary,
  },
  filterCountBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: "center",
  },
  filterCountBadgeActive: {
    backgroundColor: Colors.primary,
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#999",
  },
  filterCountTextActive: {
    color: "white",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary || "#6B7280",
    fontSize: 14,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  indexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: {
    fontSize: 11,
    fontWeight: "bold",
    color: Colors.primary,
  },
  badgesRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  intentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  intentText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  actionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  questionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
    backgroundColor: "#FFFDE7",
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#FFA000",
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    lineHeight: 20,
  },

  answerBox: {
    backgroundColor: "#F1F8F1",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  answerBoxRefuse: {
    backgroundColor: "#FFF5F5",
    borderLeftColor: "#D32F2F",
  },
  answerBoxClarify: {
    backgroundColor: "#FFF8E8",
    borderLeftColor: "#F57C00",
  },
  answerText: {
    fontSize: 13,
    color: "#444",
    lineHeight: 20,
  },
  answerTextRefuse: {
    color: "#B71C1C",
    fontStyle: "italic",
  },
  answerTextClarify: {
    color: "#9A5B00",
    fontStyle: "italic",
  },

  expandedSection: {
    marginTop: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 14,
  },
  metaBlock: {
    gap: 4,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metaCard: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  metaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  confBarBg: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  confBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  metaDetailLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaDetailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 4,
  },

  routePill: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  routePillText: {
    fontSize: 12,
    fontWeight: "800",
  },

  shareBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 6,
    elevation: 2,
  },
  shareBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  shareBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  footerDate: {
    fontSize: 11,
    color: "#BBB",
    fontWeight: "500",
  },
  tapHint: {
    fontSize: 10,
    color: "#CCC",
    fontStyle: "italic",
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#CCC",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#BBB",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
    elevation: 3,
  },
  emptyBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});