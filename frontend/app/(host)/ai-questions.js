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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "../../constants/api";
import { Colors } from "../../constants/theme";

export default function AIQuestionsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [experiences, setExperiences] = useState([]);
  const [items, setItems] = useState([]);

  const [activeExperienceId, setActiveExperienceId] = useState("ALL");
  const [hiddenUnknownIds, setHiddenUnknownIds] = useState(new Set());

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const expRes = await api.get("/experiences/my/list");
      const exps = Array.isArray(expRes.data) ? expRes.data : [];
      setExperiences(exps);

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
          console.log(
            "Unknown fetch failed for exp:",
            exp?._id,
            err?.response?.data || err?.message
          );
        }
      }

      all.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setItems(all);
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.error || "Failed to load AI Questions"
      );
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
    return [{ _id: "ALL", title: "All Experiences" }, ...experiences];
  }, [experiences]);

  const selectedExperienceTitle = useMemo(() => {
    const found = expOptions.find(
      (x) => String(x._id) === String(activeExperienceId)
    );
    return found?.title || "All Experiences";
  }, [expOptions, activeExperienceId]);

  const visibleItems = useMemo(() => {
    return (items || [])
      .filter((x) => !hiddenUnknownIds.has(String(x._id)))
      .filter((x) =>
        activeExperienceId === "ALL"
          ? true
          : String(x.experienceId) === String(activeExperienceId)
      );
  }, [items, activeExperienceId, hiddenUnknownIds]);

  const totalCount = visibleItems.length;
  const badgeText = totalCount > 99 ? "99+" : String(totalCount);

  const openAnswerModal = (item) => {
    setSelected(item);
    setAnswerText("");
    setEvidenceText("");
    setModalOpen(true);
  };

  const closeModal = () => {
    Keyboard.dismiss();
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

      setHiddenUnknownIds((prev) => {
        const next = new Set([...prev]);
        next.add(String(selected._id));
        return next;
      });

      setItems((prev) => prev.filter((x) => String(x._id) !== String(selected._id)));

      Alert.alert("Saved", "Answer saved successfully.");
      closeModal();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.error || "Failed to save answer"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getIntentConfig = (intent) => {
    const key = String(intent || "OTHER").toUpperCase();

    switch (key) {
      case "WHY":
        return {
          icon: "help-buoy-outline",
          bg: "#FFF7ED",
          border: "#FED7AA",
          text: "#C2410C",
          label: "Why",
        };
      case "HOW":
        return {
          icon: "construct-outline",
          bg: "#EFF6FF",
          border: "#BFDBFE",
          text: "#1D4ED8",
          label: "How",
        };
      case "WHAT":
        return {
          icon: "reader-outline",
          bg: "#F5F3FF",
          border: "#DDD6FE",
          text: "#6D28D9",
          label: "What",
        };
      case "WHEN":
        return {
          icon: "time-outline",
          bg: "#ECFDF5",
          border: "#A7F3D0",
          text: "#047857",
          label: "When",
        };
      case "WHERE":
        return {
          icon: "location-outline",
          bg: "#F0FDF4",
          border: "#BBF7D0",
          text: "#15803D",
          label: "Where",
        };
      case "WHO":
        return {
          icon: "people-outline",
          bg: "#FDF2F8",
          border: "#FBCFE8",
          text: "#BE185D",
          label: "Who",
        };
      case "RULES":
        return {
          icon: "shield-checkmark-outline",
          bg: "#FEFCE8",
          border: "#FDE68A",
          text: "#A16207",
          label: "Rules",
        };
      default:
        return {
          icon: "chatbubble-ellipses-outline",
          bg: "#F3F4F6",
          border: "#E5E7EB",
          text: "#4B5563",
          label: "Other",
        };
    }
  };

  const renderItem = ({ item, index }) => {
    const dateText = item.createdAt
      ? new Date(item.createdAt).toLocaleString("en-GB")
      : "";
    const intentUI = getIntentConfig(item.intent);
    const confidenceValue =
      typeof item.confidence === "number" ? item.confidence.toFixed(2) : "0.00";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberBadgeText}>{index + 1}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.expTitle} numberOfLines={1}>
                {item.experienceTitle || "Experience"}
              </Text>
              {!!item.experienceCategory && (
                <Text style={styles.categoryText} numberOfLines={1}>
                  {item.experienceCategory}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.answerBtn}
            onPress={() => openAnswerModal(item)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="create-outline"
              size={17}
              color={Colors.surface}
            />
            <Text style={styles.answerBtnText}>Answer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.intentChip,
              {
                backgroundColor: intentUI.bg,
                borderColor: intentUI.border,
              },
            ]}
          >
            <Ionicons name={intentUI.icon} size={14} color={intentUI.text} />
            <Text style={[styles.intentChipText, { color: intentUI.text }]}>
              {intentUI.label}
            </Text>
          </View>

          <View style={styles.confChip}>
            <Ionicons name="analytics-outline" size={14} color="#6B7280" />
            <Text style={styles.confChipText}>Confidence {confidenceValue}</Text>
          </View>
        </View>

        <View style={styles.questionBox}>
          <View style={styles.questionIconWrap}>
            <Ionicons name="help-circle" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.questionLabel}>Question</Text>
            <Text style={styles.questionText}>{item.question}</Text>
          </View>
        </View>

        {!!item.reason && (
          <View style={styles.reasonBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#6B7280"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.reasonLabel}>Why it was not answered</Text>
              <Text style={styles.reasonText}>{item.reason}</Text>
            </View>
          </View>
        )}

        <View style={styles.footerRow}>
          <View style={styles.timeWrap}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.timeText}>{dateText}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1B5E20", "#0F3D14"]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.roundBackBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title}>AI Questions</Text>
            <Text style={styles.subtitle}>
              Answer questions for your experiences
            </Text>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshIcon}
            activeOpacity={0.85}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color="rgba(255,255,255,0.92)"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerBottom}>
          <View style={styles.pendingCard}>
            <View style={styles.pendingLeft}>
              <View style={styles.pendingIconWrap}>
                <Ionicons
                  name="reader-outline"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <View>
                <Text style={styles.pendingLabel}>Questions to Review</Text>
                <Text style={styles.pendingSubtext}>
                  Check your unanswered questions
                </Text>
              </View>
            </View>

            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{badgeText}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Experience</Text>

          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.85}
            onPress={() => setFilterModalOpen(true)}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons
                name="funnel-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedExperienceTitle}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

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
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons
                    name="checkmark-done-circle-outline"
                    size={46}
                    color="#BDBDBD"
                  />
                </View>
                <Text style={styles.emptyTitle}>All caught up</Text>
                <Text style={styles.emptyText}>
                  No unanswered AI questions right now.
                </Text>
              </View>
            }
          />
        )}
      </View>

      <Modal
        visible={filterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.filterModalCard}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Select Experience</Text>
              <TouchableOpacity onPress={() => setFilterModalOpen(false)}>
                <Ionicons name="close" size={22} color="#444" />
              </TouchableOpacity>
            </View>

            {expOptions.map((exp) => {
              const isActive =
                String(activeExperienceId) === String(exp._id);

              return (
                <TouchableOpacity
                  key={String(exp._id)}
                  style={[
                    styles.filterOption,
                    isActive && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setActiveExperienceId(exp._id);
                    setFilterModalOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      isActive && styles.filterOptionTextActive,
                    ]}
                  >
                    {exp.title}
                  </Text>

                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.answerModalBackdrop}>
              <TouchableWithoutFeedback>
                <View style={styles.answerModalCard}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Answer Question</Text>
                    <TouchableOpacity
                      onPress={closeModal}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={22} color="#444" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.modalScroll}
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    bounces={false}
                  >
                    {!!selected && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalLabel}>Question</Text>
                        <View style={styles.modalQuestionBox}>
                          <Ionicons
                            name="help-circle-outline"
                            size={16}
                            color={Colors.primary}
                          />
                          <Text style={styles.modalQuestion}>
                            {selected.question}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Your Answer *</Text>
                      <TextInput
                        value={answerText}
                        onChangeText={setAnswerText}
                        placeholder="Write the verified answer for tourists..."
                        placeholderTextColor="#999"
                        style={styles.modalInput}
                        multiline
                        scrollEnabled
                        textAlignVertical="top"
                        returnKeyType="default"
                        blurOnSubmit={false}
                      />
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Evidence (optional)</Text>
                      <TextInput
                        value={evidenceText}
                        onChangeText={setEvidenceText}
                        placeholder="Optional note, rule, or supporting detail..."
                        placeholderTextColor="#999"
                        style={[styles.modalInput, styles.evidenceInput]}
                        multiline
                        scrollEnabled
                        textAlignVertical="top"
                        returnKeyType="default"
                        blurOnSubmit={false}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={submitAnswer}
                      disabled={submitting}
                      activeOpacity={0.85}
                      style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                    >
                      <LinearGradient
                        colors={[Colors.primary, "#388E3C"]}
                        style={styles.saveBtnGrad}
                      >
                        {submitting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={20}
                              color="#fff"
                            />
                            <Text style={styles.saveBtnText}>Save Answer</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: 18,
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

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.86)",
    marginTop: 2,
    fontWeight: "400",
  },

  refreshIcon: {
    padding: 6,
  },

  headerBottom: {
    marginTop: 14,
  },

  pendingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8F1EA",
  },

  pendingLeft: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    flex: 1,
  },

  pendingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },

  pendingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  pendingSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  pendingBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  pendingBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  filterSection: {
    marginTop: 14,
    marginBottom: 6,
  },

  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    flex: 1,
    paddingRight: 8,
  },

  dropdownText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
  },

  listContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EBEEF3",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: 10,
  },

  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 10,
    flex: 1,
  },

  numberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EEF7EF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  numberBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  expTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  categoryText: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  answerBtn: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },

  answerBtnText: {
    color: Colors.surface,
    fontWeight: "700",
    fontSize: 12,
  },

  metaRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  intentChip: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },

  intentChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  confChip: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  confChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },

  questionBox: {
    marginTop: 14,
    backgroundColor: "#F8FBF8",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DDEDDD",
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 10,
  },

  questionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },

  questionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },

  questionText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
    fontWeight: "500",
  },

  reasonBox: {
    marginTop: 10,
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ECEFF3",
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 8,
  },

  reasonLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },

  reasonText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 18,
  },

  footerRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
  },

  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    rowGap: 10,
  },

  loaderText: {
    color: "#6B7280",
    fontWeight: "400",
  },

  empty: {
    alignItems: "center",
    marginTop: 70,
    paddingHorizontal: 24,
  },

  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 14,
  },

  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    fontWeight: "400",
    marginTop: 6,
    lineHeight: 18,
  },

  modalBackdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  filterModalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
  },

  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  filterModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  filterOption: {
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  filterOptionActive: {
    backgroundColor: "#F1F8F1",
    borderColor: "#CDE7CD",
  },

  filterOptionText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
    paddingRight: 10,
  },

  filterOptionTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },

  modalRoot: {
    flex: 1,
  },

  answerModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 24 : 12,
  },

  answerModalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    maxHeight: Platform.OS === "ios" ? "78%" : "82%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  modalScroll: {
    flexGrow: 0,
  },

  modalScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },

  modalSection: {
    marginTop: 12,
  },

  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
  },

  modalQuestionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 8,
    backgroundColor: "#F8FBF8",
    borderWidth: 1,
    borderColor: "#DDEDDD",
    borderRadius: 14,
    padding: 12,
  },

  modalQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    lineHeight: 20,
  },

  modalInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 150,
    maxHeight: 220,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontWeight: "400",
  },

  evidenceInput: {
    minHeight: 120,
    maxHeight: 180,
  },

  saveBtn: {
    marginTop: 18,
    borderRadius: 14,
    overflow: "hidden",
  },

  saveBtnGrad: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    columnGap: 8,
  },

  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});