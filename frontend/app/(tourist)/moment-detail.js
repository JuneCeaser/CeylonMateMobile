import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import api from "../../constants/api";
import { Colors, Spacing } from "../../constants/theme";

const { width } = Dimensions.get("window");
const HERO_H = 300;
const CARD_W = width - Spacing.lg * 2;

export default function MomentDetailScreen() {
  const { momentId } = useLocalSearchParams();
  const router = useRouter();

  const hiddenCaptureRef = useRef(null);

  const [moment, setMoment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const goToProfile = useCallback(() => {
    router.replace("/(tourist)/profile");
  }, [router]);

  useEffect(() => {
    fetchMoment();
  }, [momentId]);

  const fetchMoment = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/moments/detail/${momentId}`);

      if (res?.data?.success) {
        setMoment(res.data.data);
      } else {
        Alert.alert("Error", "Could not load this moment.");
        goToProfile();
      }
    } catch (error) {
      console.log(
        "Fetch moment error:",
        error?.response?.data || error?.message || error
      );
      Alert.alert("Error", "Could not load this moment.");
      goToProfile();
    } finally {
      setLoading(false);
    }
  };

  const deleteMoment = async () => {
    try {
      if (!moment?._id) {
        Alert.alert("Error", "Moment id not found.");
        return;
      }

      setDeleting(true);

      const res = await api.delete(`/moments/${moment._id}`);
      console.log("Delete response:", res?.data);

      if (res?.data?.success) {
        router.replace("/(tourist)/profile");
        return;
      }

      Alert.alert("Error", "Could not delete this moment.");
    } catch (error) {
      console.log(
        "Delete moment error:",
        error?.response?.data || error?.message || error
      );
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Could not delete this moment."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Memory?",
      "This will permanently remove this AI-preserved moment.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: deleteMoment,
        },
      ]
    );
  };

  const handleShareAsCard = async () => {
    setSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));

      const uri = await captureRef(hiddenCaptureRef, {
        format: "png",
        quality: 1,
        width,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share Your Cultural Memory",
        });
      } else {
        Alert.alert("Not Supported", "Sharing is not available on this device.");
      }
    } catch (e) {
      console.log("Share card error:", e);
      Alert.alert("Error", "Could not capture the card for sharing.");
    } finally {
      setSharing(false);
    }
  };

  const handleShareAsText = async () => {
    if (!moment) return;

    const tags = (moment.hashtags || []).join(" ");
    const message =
      `🇱🇰 ${moment.experienceName}\n` +
      `📍 ${moment.location}\n\n` +
      `${moment.caption}\n\n` +
      `💡 ${moment.culturalInsight || ""}\n\n` +
      `${tags}\n\nShared via CeylonMate`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.log("Share text error:", error?.message || error);
      Alert.alert("Error", "Could not share this moment.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!moment) return null;

  const dateStr = moment.createdAt
    ? format(new Date(moment.createdAt), "MMMM d, yyyy")
    : "";

  return (
    <View style={styles.container}>
      <View style={styles.heroWrap} pointerEvents="box-none">
        <Image
          source={{ uri: moment.imageUrl }}
          style={styles.heroImg}
          resizeMode="cover"
        />

        <LinearGradient
          colors={["rgba(0,0,0,0.65)", "transparent"]}
          style={styles.topBar}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.navBtn}
            onPress={goToProfile}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, styles.deleteNavBtn]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="trash" size={20} color="white" />
            )}
          </TouchableOpacity>
        </LinearGradient>

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.88)"]}
          style={styles.heroBottom}
          pointerEvents="none"
        >
          <Text style={styles.heroTitle}>{moment.experienceName}</Text>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: HERO_H }} />

        <View style={styles.contentCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaLocChip}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.metaLocText} numberOfLines={1}>
                {moment.location}
              </Text>
            </View>

            <View style={styles.metaDateChip}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={Colors.textSecondary}
              />
              <Text style={styles.metaDateText}>{dateStr}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.storySection}>
            <View style={styles.sectionLabelRow}>
              <Ionicons name="menu" size={17} color={Colors.primary} />
              <Text style={styles.sectionLabel}>AI STORY</Text>
            </View>
            <Text style={styles.storyText}>{moment.caption}</Text>
          </View>

          {!!moment.culturalInsight && (
            <>
              <View style={styles.divider} />
              <LinearGradient
                colors={[Colors.primary, "#155724"]}
                style={styles.insightCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.insightLabelRow}>
                  <Text style={{ fontSize: 18 }}>💡</Text>
                  <Text style={styles.insightTitle}>Cultural Insight</Text>
                </View>
                <Text style={styles.insightBody}>{moment.culturalInsight}</Text>
              </LinearGradient>
            </>
          )}

          {moment.hashtags?.length > 0 && (
            <View style={styles.tagsRow}>
              {moment.hashtags.map((tag, i) => (
                <Text key={i} style={styles.tagChip}>
                  {tag}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.shareSection}>
            <View style={styles.shareTitleRow}>
              <Ionicons name="share-social" size={17} color={Colors.primary} />
              <Text style={styles.shareSectionTitle}>SHARE THIS MEMORY</Text>
            </View>

            <Text style={styles.shareDesc}>
              Share your cultural experience with the world and inspire others to
              explore Sri Lanka.
            </Text>

            <View style={styles.previewCard}>
              <Image
                source={{ uri: moment.imageUrl }}
                style={styles.previewImg}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.92)"]}
                style={styles.previewOverlay}
              >
                <View style={styles.brandPill}>
                  <Text style={{ fontSize: 13 }}>🇱🇰</Text>
                  <Text style={styles.brandName}>CeylonMate</Text>
                </View>
                <Text style={styles.previewTitle}>{moment.experienceName}</Text>
                <Text style={styles.previewLoc}>📍 {moment.location}</Text>
                <Text style={styles.previewCaption} numberOfLines={2}>
                  {moment.caption}
                </Text>
                <Text style={styles.previewTags}>
                  {(moment.hashtags || []).slice(0, 3).join("  ")}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.shareBtnsRow}>
              <TouchableOpacity
                style={styles.shareCardBtnWrap}
                onPress={handleShareAsCard}
                disabled={sharing}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#2E7D32", "#1B5E20"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shareCardBtnInner}
                >
                  {sharing ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={20} color="white" />
                      <Text style={styles.shareCardBtnText}>Share as Card</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareTextBtn}
                onPress={handleShareAsText}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.shareTextBtnLabel}>Share as Text</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.captureWrapper} pointerEvents="none">
        <View
          ref={hiddenCaptureRef}
          style={styles.captureCard}
          collapsable={false}
        >
          <Image
            source={{ uri: moment.imageUrl }}
            style={styles.captureImg}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.92)"]}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.captureOverlayContent}>
              <View style={styles.brandPill}>
                <Text style={{ fontSize: 15 }}>🇱🇰</Text>
                <Text style={[styles.brandName, { fontSize: 14 }]}>
                  CeylonMate
                </Text>
              </View>
              <Text style={styles.captureTitleText}>
                {moment.experienceName}
              </Text>
              <Text style={styles.captureLocText}>📍 {moment.location}</Text>
              <Text style={styles.captureCaptionText}>{moment.caption}</Text>
              <Text style={styles.captureTagsText}>
                {(moment.hashtags || []).join("  ")}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F5" },

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F7F5",
  },

  heroWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_H,
    zIndex: 50,
    elevation: 50,
  },

  heroImg: {
    width: "100%",
    height: "100%",
  },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 60,
    elevation: 60,
  },

  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 70,
    elevation: 70,
  },

  deleteNavBtn: {
    backgroundColor: "rgba(211,47,47,0.88)",
  },

  heroBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    justifyContent: "flex-end",
    paddingHorizontal: 18,
    paddingBottom: 16,
  },

  heroTitle: {
    color: "white",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  scroll: {
    flex: 1,
    zIndex: 1,
    elevation: 1,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  contentCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: 22,
    paddingBottom: Spacing.lg,
    minHeight: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  metaLocChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    flexShrink: 1,
  },

  metaLocText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
    flexShrink: 1,
  },

  metaDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaDateText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEF2EF",
    marginVertical: 16,
  },

  storySection: {
    marginBottom: 2,
  },

  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 1.2,
  },

  storyText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 27,
    fontStyle: "italic",
  },

  insightCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },

  insightLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  insightTitle: {
    color: "#FFA000",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  insightBody: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    lineHeight: 23,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },

  tagChip: {
    color: "#F97316",
    fontWeight: "700",
    fontSize: 13,
  },

  shareSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEF2EF",
  },

  shareTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  shareSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 1.2,
  },

  shareDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },

  previewCard: {
    width: "100%",
    height: CARD_W * 0.62,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 18,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },

  previewImg: {
    width: "100%",
    height: "100%",
  },

  previewOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "90%",
    justifyContent: "flex-end",
    padding: 14,
  },

  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46,125,50,0.82)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
    gap: 5,
    marginBottom: 8,
  },

  brandName: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },

  previewTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 24,
  },

  previewLoc: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 3,
  },

  previewCaption: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },

  previewTags: {
    color: "#FFA000",
    fontWeight: "700",
    fontSize: 11,
    marginTop: 7,
  },

  shareBtnsRow: {
    flexDirection: "row",
    gap: 12,
  },

  shareCardBtnWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
  },

  shareCardBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 10,
    gap: 8,
  },

  shareCardBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },

  shareTextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: "#fff",
    gap: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },

  shareTextBtnLabel: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },

  captureWrapper: {
    position: "absolute",
    top: -10000,
    left: 0,
    width,
  },

  captureCard: {
    width,
    height: width,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#000",
  },

  captureImg: {
    width: "100%",
    height: "100%",
  },

  captureOverlayContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 24,
  },

  captureTitleText: {
    color: "white",
    fontWeight: "900",
    fontSize: 28,
    lineHeight: 34,
    marginTop: 10,
  },

  captureLocText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    marginTop: 5,
  },

  captureCaptionText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },

  captureTagsText: {
    color: "#FFA000",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 12,
  },
});