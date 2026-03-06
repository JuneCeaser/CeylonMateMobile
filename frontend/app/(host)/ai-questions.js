// frontend/app/(host)/ai-questions.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "../../constants/api";
import { Colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

/**
 * Screen goal:
 * - Show "Unknown questions" (AI couldn't answer) per host experiences
 * - Allow host to answer -> saves to VerifiedQA (so next time AI can answer instantly)
 *
 * Uses backend endpoints you already have:
 * - GET  /api/experiences/my/list
 * - GET  /api/assistant/unknown/:experienceId
 * - POST /api/assistant/verifiedqa/add   { experienceId, question, answer, evidence? }
 *
 * NOTE:
 * Your backend currently DOES NOT have "mark unknown as resolved".
 * So even after answering, the UnknownQuestion record will still exist.
 * Here we hide it locally after successful submit (optimistic).
 * If you want it removed permanently, add a backend endpoint to delete/resolve it.
 */

export default function AIQuestionsScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [experiences, setExperiences] = useState([]);
  const [items, setItems] = useState([]); // flattened unknown questions

  // filter/search
  const [activeExperienceId, setActiveExperienceId] = useState("ALL");
  const [query, setQuery] = useState("");

  // local hide-after-answer (since backend doesn’t resolve unknown yet)
  const [hiddenUnknownIds, setHiddenUnknownIds] = useState(new Set());

  // answer modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null); // unknown item
  const [answerText, setAnswerText] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      // 1) host experiences
      const expRes = await api.get("/experiences/my/list");
      const exps = Array.isArray(expRes.data) ? expRes.data : [];
      setExperiences(exps);

      // 2) unknown questions for each experience
      // Flatten them with exp info so UI can show experience title
      const all = [];
      for (const exp of exps) {
        try {
          const uRes = await api.get(`/assistant/unknown/${exp._id}`);
          const list = Array.isArray(uRes.data) ? uRes.data : [];
          list.forEach((u) => {
            all.push({
              ...u,
              experienceTitle: exp.title,
              experienceCategory: exp.category,
            });
          });
        } catch (err) {
          // don’t break the whole screen if one experience fails
          console.log("Unknown fetch failed for exp:", exp?._id, err?.response?.data || err?.message);
        }
      }

      // newest first
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(all);
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.error || "Failed to load AI Questions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  const expOptions = useMemo(() => {
    const base = [{ _id: "ALL", title: "All Experiences" }, ...experiences];
    return base;
  }, [experiences]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (items || [])
      .filter((x) => !hiddenUnknownIds.has(String(x._id)))
      .filter((x) => (activeExperienceId === "ALL" ? true : String(x.experienceId) === String(activeExperienceId)))
      .filter((x) => {
        if (!q) return true;
        const hay =
          `${x.question || ""} ${x.experienceTitle || ""} ${x.intent || ""} ${x.reason || ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [items, activeExperienceId, query, hiddenUnknownIds]);

  const totalCount = visibleItems.length;

  const openAnswerModal = (item) => {
    setSelected(item);
    setAnswerText("");
    setEvidenceText("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
    setAnswerText("");
    setEvidenceText("");
  };

  const submitAnswer = async () => {
    if (!selected) return;

    const cleanAnswer = (answerText || "").trim();
    if (!cleanAnswer) {
      Alert.alert("Missing Answer", "Please write an answer before saving.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/assistant/verifiedqa/add", {
        experienceId: selected.experienceId,
        question: selected.question,
        answer: cleanAnswer,
        evidence: (evidenceText || "").trim(),
      });

      // Hide locally (since backend doesn't resolve unknown yet)
      setHiddenUnknownIds((prev) => {
        const next = new Set([...prev]);
        next.add(String(selected._id));
        return next;
      });

      Alert.alert("Saved ✅", "Answer saved to Verified Q&A. Next time the assistant will respond instantly.");
      closeModal();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.error || "Failed to save answer");
    } finally {
      setSubmitting(false);
    }
  };

  const badgeText = totalCount > 99 ? "99+" : String(totalCount);

  const renderExperienceFilter = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {expOptions.map((exp) => {
          const isActive = String(activeExperienceId) === String(exp._id);
          return (
            <TouchableOpacity
              key={String(exp._id)}
              onPress={() => setActiveExperienceId(exp._id)}
              activeOpacity={0.85}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]} numberOfLines={1}>
                {exp.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderItem = ({ item }) => {
    const dateText = item.createdAt ? new Date(item.createdAt).toLocaleString("en-GB") : "";

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.expTitle} numberOfLines={1}>
              {item.experienceTitle || "Experience"}
            </Text>
            <Text style={styles.metaLine} numberOfLines={1}>
              <Text style={styles.metaLabel}>Intent: </Text>
              <Text style={styles.metaValue}>{item.intent || "OTHER"}</Text>
              <Text style={styles.metaDot}> • </Text>
              <Text style={styles.metaLabel}>Confidence: </Text>
              <Text style={styles.metaValue}>{typeof item.confidence === "number" ? item.confidence.toFixed(2) : "0.00"}</Text>
            </Text>
            <Text style={styles.metaLine} numberOfLines={1}>
              <Text style={styles.metaLabel}>Asked: </Text>
              <Text style={styles.metaValue}>{dateText}</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.answerBtn} onPress={() => openAnswerModal(item)} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.answerBtnText}>Answer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.qBox}>
          <Ionicons name="help-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.questionText}>{item.question}</Text>
        </View>

        {!!item.reason && (
          <View style={styles.reasonBox}>
            <Ionicons name="information-circle-outline" size={16} color="#888" />
            <Text style={styles.reasonText} numberOfLines={3}>
              {item.reason}
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
          <TouchableOpacity onPress={() => router.back()} style={styles.roundBackBtn}>
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title}>AI Questions</Text>
            <Text style={styles.subtitle}>
              {userProfile?.name ? `${userProfile.name} • ` : ""}
              Answer & teach your assistant
            </Text>
          </View>

          <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon} activeOpacity={0.85}>
            <Ionicons name="sync" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerStatsRow}>
          <View style={styles.statPill}>
            <Ionicons name="chatbubbles-outline" size={14} color={Colors.primary} />
            <Text style={styles.statText}>Pending</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          </View>

          <View style={styles.statPillSoft}>
            <Ionicons name="sparkles-outline" size={14} color="#FFFFFF" />
            <Text style={styles.statTextSoft}>When you answer, it saves to Verified Q&A</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search questions, intent, experience..."
              placeholderTextColor="#999"
              style={styles.searchInput}
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color="#B0B0B0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {renderExperienceFilter()}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loaderText}>Loading AI questions...</Text>
          </View>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(x) => String(x._id)}
            renderItem={renderItem}
            refreshing={refreshing}
            onRefresh={onRefresh}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="checkmark-done-circle-outline" size={44} color="#BDBDBD" />
                <Text style={styles.emptyTitle}>All caught up</Text>
                <Text style={styles.emptyText}>No unanswered AI questions right now.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Answer Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Answer Question</Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#444" />
              </TouchableOpacity>
            </View>

            {!!selected && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Experience</Text>
                  <Text style={styles.modalValue} numberOfLines={1}>
                    {selected.experienceTitle}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Question</Text>
                  <Text style={styles.modalQuestion}>{selected.question}</Text>
                </View>
              </>
            )}

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Your Answer *</Text>
              <TextInput
                value={answerText}
                onChangeText={setAnswerText}
                placeholder="Write the correct verified answer for tourists..."
                placeholderTextColor="#999"
                style={styles.modalInput}
                multiline
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Evidence (optional)</Text>
              <TextInput
                value={evidenceText}
                onChangeText={setEvidenceText}
                placeholder="Optional supporting note, rule, or short snippet..."
                placeholderTextColor="#999"
                style={[styles.modalInput, { minHeight: 70 }]}
                multiline
              />
            </View>

            <TouchableOpacity
              onPress={submitAnswer}
              disabled={submitting}
              activeOpacity={0.85}
              style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
            >
              <LinearGradient colors={[Colors.primary, "#388E3C"]} style={styles.saveBtnGrad}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Save to Verified Q&A</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.modalHint}>
              Tip: This will make the assistant answer this question instantly next time.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },

  // Header
  header: { paddingTop: 62, paddingBottom: 18, paddingHorizontal: 16 },
  headerTop: { flexDirection: "row", alignItems: "center" },
  roundBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: "400" },
  refreshIcon: { padding: 6 },

  headerStatsRow: { marginTop: 12, rowGap: 10 },

  statPill: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  statText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  badge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    minWidth: 26,
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  statPillSoft: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  statTextSoft: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "400",
    flex: 1,
    lineHeight: 16,
  },

  // Content
  content: { flex: 1, paddingHorizontal: 16 },

  // Search
  searchRow: { marginTop: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 0, fontWeight: "400" },

  // Filters
  filterRow: { paddingVertical: 12, paddingRight: 10, columnGap: 10 },
  filterPill: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    maxWidth: 220,
  },
  filterPillActive: { backgroundColor: "#F1F8F1", borderColor: "#CDE7CD" },
  filterText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  filterTextActive: { color: Colors.primary, fontWeight: "600" },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", columnGap: 10 },
  cardLeft: { flex: 1 },

  expTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },

  metaLine: { marginTop: 4, fontSize: 11, color: "#6B7280" },
  metaLabel: { color: "#9CA3AF", fontWeight: "500" },
  metaValue: { color: "#6B7280", fontWeight: "500" },
  metaDot: { color: "#D1D5DB" },

  // Answer button
  answerBtn: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    backgroundColor: Colors.primary + "12",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  answerBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 12 },

  // Question box
  qBox: {
    marginTop: 12,
    backgroundColor: "#F6FAF6",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    columnGap: 8,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#DDF0DD",
  },
  questionText: { flex: 1, color: "#111827", fontSize: 13, fontWeight: "500", lineHeight: 18 },

  // Reason
  reasonBox: {
    marginTop: 10,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    columnGap: 8,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  reasonText: { flex: 1, color: "#6B7280", fontSize: 12, fontWeight: "400", lineHeight: 17 },

  // Loader / empty
  loader: { flex: 1, alignItems: "center", justifyContent: "center", rowGap: 10 },
  loaderText: { color: "#6B7280", fontWeight: "400" },

  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 20, rowGap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 6 },
  emptyText: { textAlign: "center", color: "#6B7280", fontWeight: "400" },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },

  modalSection: { marginTop: 12 },
  modalLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  modalValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  modalQuestion: { fontSize: 14, fontWeight: "500", color: "#111827", lineHeight: 20 },

  modalInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 90,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontWeight: "400",
  },

  saveBtn: { marginTop: 14, borderRadius: 14, overflow: "hidden" },
  saveBtnGrad: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    columnGap: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  modalHint: {
    marginTop: 10,
    textAlign: "center",
    color: "#6B7280",
    fontWeight: "400",
    fontSize: 12,
    lineHeight: 16,
  },
});