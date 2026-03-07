import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import Markdown from "react-native-markdown-display";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar } from "react-native-calendars";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../context/AuthContext";
import api from "../../constants/api";

const { width, height } = Dimensions.get("window");
const HERO_HEIGHT = 220;

export default function ExperienceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const recordingRef = useRef(null);
  const autoStopTimerRef = useRef(null);

  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);
  const [aiText, setAiText] = useState("");
  const [recognizedQuestion, setRecognizedQuestion] = useState("");
  const [assistantMeta, setAssistantMeta] = useState(null);

  const [availableVoices, setAvailableVoices] = useState([]);
  const [preferredVoice, setPreferredVoice] = useState(null);

  const [isModalVisible, setModalVisible] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [disabledDates, setDisabledDates] = useState({});
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    fetchDetails();
    prepareAudio();
    loadVoices();

    return () => {
      Speech.stop();
      clearAutoStopTimer();

      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, [id]);

  const clearAutoStopTimer = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  };

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/experiences/${id}`);
      setExp(res.data || null);
    } catch (e) {
      Alert.alert("Error", "Could not load experience details.");
      router.replace("/(tourist)/culture");
    } finally {
      setLoading(false);
    }
  };

  const fetchExperienceAvailability = async () => {
    try {
      const res = await api.get(`/bookings/experience-availability/${id}`);

      const marked = {};
      (res.data || []).forEach((booking) => {
        const dateKey = (booking.bookingDate || "").split("T")[0];
        if (!dateKey) return;

        marked[dateKey] = {
          disabled: true,
          disableTouchEvent: true,
          marked: true,
          dotColor: "#D32F2F",
        };
      });

      setDisabledDates(marked);
    } catch (e) {
      console.log(
        "Experience availability error:",
        e?.response?.data || e?.message || e
      );
      setDisabledDates({});
    }
  };

  useEffect(() => {
    if (id) {
      fetchExperienceAvailability();
    }
  }, [id]);

  const prepareAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.error("Audio init error:", e?.message || e);
    }
  };

  const loadVoices = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const safeVoices = Array.isArray(voices) ? voices : [];
      setAvailableVoices(safeVoices);

      const femaleVoice = pickFemaleVoice(safeVoices);
      setPreferredVoice(femaleVoice || null);
    } catch (e) {
      console.log("Voice load error:", e?.message || e);
      setAvailableVoices([]);
      setPreferredVoice(null);
    }
  };

  const pickFemaleVoice = (voices = []) => {
    if (!voices.length) return null;

    const preferredKeywords = [
      "female",
      "woman",
      "girl",
      "samantha",
      "karen",
      "moira",
      "siri female",
      "ava",
      "allison",
      "joanna",
      "aria",
      "serena",
    ];

    const englishVoices = voices.filter((v) => {
      const lang = (v.language || "").toLowerCase();
      return lang.includes("en");
    });

    const preferred = englishVoices.find((v) => {
      const name = `${v.name || ""} ${v.identifier || ""}`.toLowerCase();
      return preferredKeywords.some((k) => name.includes(k));
    });

    return preferred || englishVoices[0] || voices[0];
  };

  const speakAnswer = async (text) => {
    try {
      if (!text) return;

      Speech.stop();

      const femaleVoice = preferredVoice || pickFemaleVoice(availableVoices);

      const options = {
        rate: 0.92,
        pitch: 1.08,
      };

      if (femaleVoice?.identifier) {
        options.voice = femaleVoice.identifier;
      }

      Speech.speak(text, options);
    } catch (e) {
      console.log("Speech speak error:", e?.message || e);
    }
  };

  const getAssistantStatusLabel = (meta) => {
    if (!meta) return null;

    if (meta.action === "ANSWER" && meta.route === "VERIFIED_QA") {
      return {
        text: "Verified answer",
        bg: "#ECFDF3",
        color: "#166534",
        icon: "shield-checkmark-outline",
      };
    }

    if (meta.action === "ANSWER" && meta.route === "EXPERIENCE") {
      return {
        text: "Experience guide",
        bg: "#EFF6FF",
        color: "#1D4ED8",
        icon: "book-outline",
      };
    }

    if (meta.action === "REFUSE") {
      return {
        text: "Needs a different question",
        bg: "#FEFCE8",
        color: "#A16207",
        icon: "help-circle-outline",
      };
    }

    return null;
  };

  const handleVRNavigation = () => {
    if (!exp?.vrPreview?.url) {
      Alert.alert(
        "Not Available",
        "360 preview is not available for this experience yet."
      );
      return;
    }

    router.push({
      pathname: "/vr-viewer",
      params: { imageUrl: exp.vrPreview.url },
    });
  };

  const openInMaps = async () => {
    const coordinates = exp?.location?.coordinates;
    const hasCoordinates =
      Array.isArray(coordinates) &&
      coordinates.length === 2 &&
      coordinates[0] != null &&
      coordinates[1] != null;

    if (!hasCoordinates) {
      Alert.alert("Location", "Exact map coordinates are not available.");
      return;
    }

    const lng = coordinates[0];
    const lat = coordinates[1];
    const label = encodeURIComponent(exp?.title || "Experience Location");

    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Maps", "Could not open maps on this device.");
      }
    } catch (e) {
      Alert.alert("Maps", "Could not open maps.");
    }
  };

  const startRecording = async () => {
    try {
      if (isAiProcessing || isListening) return;

      const { status } = await Audio.getPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } = await Audio.requestPermissionsAsync();
        if (newStatus !== "granted") {
          Alert.alert("Permission Needed", "Microphone permission is required.");
          return;
        }
      }

      setAiText("");
      setRecognizedQuestion("");
      setAssistantMeta(null);
      setAiVisible(true);
      Speech.stop();

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsListening(true);

      clearAutoStopTimer();
      autoStopTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 10000);
    } catch (err) {
      console.error("Start recording error:", err?.message || err);
      setIsListening(false);
      clearAutoStopTimer();
      setAiVisible(false);
      Alert.alert("Error", "Could not start recording.");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    clearAutoStopTimer();
    setIsListening(false);
    setIsAiProcessing(true);
    setAiVisible(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        setTimeout(() => {
          handleVoiceQuery(uri);
        }, 300);
      } else {
        setIsAiProcessing(false);
        Alert.alert("Error", "Recording file not found. Try again.");
      }
    } catch (err) {
      console.error("Stop recording error:", err?.message || err);
      setIsAiProcessing(false);
      recordingRef.current = null;
      Alert.alert("Error", "Could not stop recording properly.");
    }
  };

  const toggleRecording = async () => {
    if (isAiProcessing) return;

    if (isListening) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleVoiceQuery = async (uri) => {
    try {
      const formData = new FormData();

      formData.append("audio", {
        uri,
        type: "audio/m4a",
        name: "speech.m4a",
      });

      formData.append("experienceId", exp?._id);

      const response = await api.post("/assistant/voice", formData, {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000,
      });

      const answer = response?.data?.answer || "";
      const transcript =
        response?.data?.recognizedText ||
        response?.data?.transcript ||
        response?.data?.question ||
        "";
      const meta = response?.data?.meta || null;

      setRecognizedQuestion(transcript);
      setAssistantMeta(meta);

      if (answer) {
        setAiText(answer);
        setAiVisible(true);
        speakAnswer(answer);
      } else {
        setAiText("I could not generate a helpful answer. Please try asking in a different way.");
        setAiVisible(true);
      }
    } catch (error) {
      console.log(
        "Assistant error:",
        error?.response?.data || error?.message || error
      );

      setAssistantMeta({
        action: "REFUSE",
        route: "NONE",
      });

      setAiText(
        "I could not answer right now. Please try again with a short question about this experience."
      );
      setAiVisible(true);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const closeAssistantOverlay = () => {
    Speech.stop();
    clearAutoStopTimer();

    setIsListening(false);
    setIsAiProcessing(false);
    setAiVisible(false);

    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
  };

  const handleViewHistory = () => {
    closeAssistantOverlay();
    router.push("/(tourist)/qa-history");
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please sign in to book.");
      return;
    }

    if (!selectedDate) {
      Alert.alert("Date Required", "Please select a date.");
      return;
    }

    if (disabledDates?.[selectedDate]?.disabled) {
      Alert.alert("Not Available", "This date is currently not available.");
      return;
    }

    setIsBooking(true);

    try {
      const finalBookingDate = new Date(selectedDate);
      finalBookingDate.setHours(selectedTime.getHours());
      finalBookingDate.setMinutes(selectedTime.getMinutes());
      finalBookingDate.setSeconds(0);

      const bookingData = {
        experience: exp._id,
        touristName: userProfile?.name || "Traveler",
        bookingDate: finalBookingDate.toISOString(),
        guests: guestCount,
        totalPrice: Number(exp.price || 0) * guestCount,
      };

      await api.post("/bookings/add", bookingData);

      setModalVisible(false);

      Alert.alert("Success!", "Booking request sent to host.", [
        {
          text: "OK",
          onPress: () => router.replace("/(tourist)/my-bookings"),
        },
      ]);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error || "Booking failed.");
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#2E7D32" style={styles.loader} />
    );
  }

  const heroImage =
    exp?.images?.[0] ||
    exp?.vrPreview?.url ||
    "https://via.placeholder.com/800x500";

  const coordinates = exp?.location?.coordinates;
  const hasExactCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates[0] != null &&
    coordinates[1] != null;

  const showPublicLocation =
    !!exp?.location &&
    (exp?.location?.address ||
      exp?.location?.city ||
      exp?.location?.district ||
      exp?.location?.placeName);

  const locationText = exp?.location?.address
    ? exp.location.address
    : [exp?.location?.city, exp?.location?.district]
        .filter(Boolean)
        .join(", ");

  const assistantStatus = getAssistantStatusLabel(assistantMeta);

  return (
    <View style={styles.container}>
      <View style={styles.heroContainer}>
        <Image source={{ uri: heroImage }} style={styles.heroImg} />

        <LinearGradient
          colors={["rgba(0,0,0,0.50)", "transparent"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.replace("/(tourist)/culture")}
              style={styles.iconBtn}
              activeOpacity={0.78}
            >
              <Ionicons name="arrow-back" size={22} color="white" />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setWishlisted(!wishlisted)}
              activeOpacity={0.78}
            >
              <Ionicons
                name={wishlisted ? "heart" : "heart-outline"}
                size={22}
                color={wishlisted ? "#FF5252" : "white"}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.heroOverlay}>
          <View style={styles.badgeRow}>
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{exp?.category}</Text>
            </View>

            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>
                {Number(exp?.rating || 0) > 0
                  ? Number(exp.rating).toFixed(1)
                  : "New"}
              </Text>
            </View>

            {!!exp?.vrPreview?.url && (
              <View style={styles.vrBadge}>
                <Ionicons name="glasses-outline" size={11} color="#fff" />
                <Text style={styles.vrBadgeText}>360 Preview</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={{ height: HERO_HEIGHT + 26 }} />

        <View style={styles.contentBody}>
          <Text style={styles.mainTitle}>{exp?.title}</Text>

          <View style={styles.hostCard}>
            <View style={styles.expertRow}>
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?background=2E7D32&color=fff&name=${encodeURIComponent(
                    exp?.hostName || "Local Guide"
                  )}`,
                }}
                style={styles.hostAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.expertLabel}>Hosted by</Text>
                <Text style={styles.expertName}>
                  {exp?.hostName || "Local Guide"}
                </Text>
              </View>
            </View>
          </View>

          {!!exp?.publicSummary ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Quick Summary</Text>
              <Text style={styles.summaryText}>{exp.publicSummary}</Text>
            </View>
          ) : null}

          <View style={styles.infoGrid}>
            {!!exp?.duration && (
              <View style={styles.metaMiniCard}>
                <Ionicons name="time-outline" size={18} color="#2E7D32" />
                <Text style={styles.metaMiniLabel}>Duration</Text>
                <Text style={styles.metaMiniValue}>{exp.duration}</Text>
              </View>
            )}

            <View style={styles.metaMiniCard}>
              <Ionicons name="wallet-outline" size={18} color="#2E7D32" />
              <Text style={styles.metaMiniLabel}>Price</Text>
              <Text style={styles.metaMiniValue}>
                LKR {Number(exp?.price || 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {showPublicLocation && !!locationText ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.subHeading}>Location</Text>

              <View style={styles.locationTextRow}>
                <Ionicons name="location-outline" size={18} color="#2E7D32" />
                <Text style={styles.metaText}>{locationText}</Text>
              </View>

              {exp?.location?.shareExactLocation && hasExactCoordinates ? (
                <TouchableOpacity
                  style={styles.locationMapCard}
                  activeOpacity={0.88}
                  onPress={openInMaps}
                >
                  <LinearGradient
                    colors={["#ECFDF3", "#F7FFF9"]}
                    style={styles.mapGradient}
                  >
                    <View style={styles.mapTopRow}>
                      <View style={styles.mapBadge}>
                        <Ionicons name="map-outline" size={14} color="#2E7D32" />
                        <Text style={styles.mapBadgeText}>Map Preview</Text>
                      </View>

                      <View style={styles.mapOpenPill}>
                        <Text style={styles.mapOpenText}>Open Maps</Text>
                        <Ionicons name="open-outline" size={13} color="#2E7D32" />
                      </View>
                    </View>

                    <View style={styles.mapCenter}>
                      <View style={styles.mapPinCircle}>
                        <Ionicons name="location" size={26} color="#fff" />
                      </View>
                    </View>

                    <Text style={styles.mapBottomText}>
                      Tap to view the host location in your maps app
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.generalAreaNote}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color="#2E7D32"
                  />
                  <Text style={styles.generalAreaText}>
                    Only the general area is shared before booking.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {!!exp?.vrPreview?.url && (
            <View style={styles.sectionBlock}>
              <Text style={styles.subHeading}>Immersive Preview</Text>

              <TouchableOpacity
                style={styles.previewCompactCard}
                onPress={handleVRNavigation}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: exp.vrPreview.url }}
                  style={styles.previewCompactImage}
                />

                <View style={styles.previewCompactContent}>
                  <View style={styles.previewCompactTop}>
                    <View style={styles.previewSmallIconWrap}>
                      <Ionicons
                        name="glasses-outline"
                        size={18}
                        color="white"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewCompactTitle}>
                        Open 360° Preview
                      </Text>
                      <Text
                        style={styles.previewCompactSubtitle}
                        numberOfLines={2}
                      >
                        Explore the experience space before booking
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#2E7D32"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.sectionBlock}>
            <Text style={styles.subHeading}>Cultural AI Voice Assistant</Text>
            <LinearGradient
              colors={["#2E7D32", "#1B5E20"]}
              style={styles.aiCard}
            >
              <View style={styles.aiCardContent}>
                <View style={styles.aiTextPart}>
                  <Text style={styles.aiCardTitle}>Ask CeylonMate</Text>
                  <Text style={styles.aiCardDesc}>
                    Tap the mic to start and tap again to stop. Ask about this
                    experience, traditions, materials, meanings, or steps.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.aiMicBtn,
                    isListening && styles.aiMicBtnActive,
                    isAiProcessing && { opacity: 0.6 },
                  ]}
                  onPress={toggleRecording}
                  disabled={isAiProcessing}
                  activeOpacity={0.86}
                >
                  <Ionicons
                    name={isListening ? "stop" : "mic-outline"}
                    size={26}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          <TouchableOpacity
            style={styles.historyCard}
            onPress={() => router.push("/(tourist)/qa-history")}
            activeOpacity={0.88}
          >
            <View style={styles.historyIconWrap}>
              <Ionicons
                name="chatbubbles-outline"
                size={22}
                color="#2E7D32"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>View Q&A History</Text>
              <Text style={styles.historySub}>
                See previous questions and answers for this experience
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isListening || isAiProcessing || aiVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.voiceOverlay}>
          <LinearGradient
            colors={["rgba(0,0,0,0.95)", "rgba(20,60,30,0.98)"]}
            style={styles.voiceOverlayGradient}
          >
            <View style={styles.voiceCenterContent}>
              {isListening ? (
                <>
                  <View style={styles.pulseContainer}>
                    <View style={styles.pulseCircle} />
                    <View style={styles.micCircleActive}>
                      <Ionicons name="mic" size={60} color="white" />
                    </View>
                  </View>
                  <Text style={styles.voiceStatusText}>Listening...</Text>
                  <Text style={styles.voiceSubText}>
                    Ask your question. Recording stops automatically in 10
                    seconds.
                  </Text>
                </>
              ) : isAiProcessing ? (
                <>
                  <ActivityIndicator
                    size="large"
                    color="#FFA000"
                    style={{ marginBottom: 20 }}
                  />
                  <Text style={styles.voiceStatusText}>Processing...</Text>
                  <Text style={styles.voiceSubText}>
                    Analyzing your question...
                  </Text>

                  {!!recognizedQuestion && (
                    <View style={styles.processingTranscriptCard}>
                      <Text style={styles.processingTranscriptLabel}>
                        Transcript
                      </Text>
                      <Text style={styles.processingTranscriptText}>
                        &quot;{recognizedQuestion}&quot;
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.fullScreenResult}>
                  <View style={styles.transcriptCard}>
                    <View style={styles.transcriptHeaderRow}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={18}
                        color="#FFA000"
                      />
                      <Text style={styles.transcriptLabel}>Your Question</Text>
                    </View>

                    <Text style={styles.transcriptText}>
                      {recognizedQuestion
                        ? `"${recognizedQuestion}"`
                        : "No transcript available"}
                    </Text>
                  </View>

                  {!!assistantStatus && (
                    <View
                      style={[
                        styles.assistantMetaPill,
                        { backgroundColor: assistantStatus.bg },
                      ]}
                    >
                      <Ionicons
                        name={assistantStatus.icon}
                        size={14}
                        color={assistantStatus.color}
                      />
                      <Text
                        style={[
                          styles.assistantMetaPillText,
                          { color: assistantStatus.color },
                        ]}
                      >
                        {assistantStatus.text}
                      </Text>
                    </View>
                  )}

                  <View style={styles.aiResultDivider} />

                  <ScrollView
                    style={styles.resultScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.answerCard}>
                      <View style={styles.aiHeaderRow}>
                        <MaterialCommunityIcons
                          name="robot-happy"
                          size={24}
                          color="#FFA000"
                        />
                        <Text style={styles.aiHeaderLabel}>CeylonMate Guide</Text>
                      </View>

                      <Markdown style={fullMarkdownStyles}>{aiText}</Markdown>
                    </View>

                    {assistantMeta?.action === "REFUSE" && (
                      <View style={styles.tryAskCard}>
                        <Ionicons
                          name="bulb-outline"
                          size={18}
                          color="#F59E0B"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tryAskTitle}>Try asking about</Text>
                          <Text style={styles.tryAskText}>
                            materials, tools, meanings, traditions, steps, safety,
                            or the history of this experience.
                          </Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.viewHistoryBtn}
                      onPress={handleViewHistory}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color="white"
                      />
                      <Text style={styles.viewHistoryBtnText}>
                        Open Full Q&A History
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="rgba(255,255,255,0.7)"
                      />
                    </TouchableOpacity>

                    <Text style={styles.askAgainHint}>
                      Tap the mic again to ask another question
                    </Text>
                  </ScrollView>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.voiceCloseBtn}
              onPress={closeAssistantOverlay}
            >
              <Ionicons
                name="close-circle"
                size={50}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      <View style={styles.footerSticky}>
        <TouchableOpacity
          style={styles.bookActionBtnFull}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.9}
        >
          <View style={styles.priceContainer}>
            <Text style={styles.footerPriceText}>
              LKR {Number(exp?.price || 0).toLocaleString()}
            </Text>
            <Text style={styles.footerSubText}>Per person</Text>
          </View>

          <View style={styles.footerSeparator} />

          <View style={styles.bookNowContainer}>
            <Text style={styles.bookNowText}>Book Experience</Text>
            <Ionicons name="chevron-forward" size={18} color="white" />
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.mHandle} />
            <View style={styles.mHeaderRow}>
              <Text style={styles.mHeader}>Schedule Experience</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#CCC" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={styles.bookingCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="calendar" size={18} color="#2E7D32" />
                  <Text style={styles.cardTitle}>Select Date</Text>
                </View>

                <Calendar
                  minDate={new Date().toISOString().split("T")[0]}
                  markedDates={{
                    ...disabledDates,
                    ...(selectedDate
                      ? {
                          [selectedDate]: {
                            ...(disabledDates?.[selectedDate] || {}),
                            selected: true,
                            selectedColor: "#2E7D32",
                            selectedTextColor: "white",
                          },
                        }
                      : {}),
                  }}
                  onDayPress={(day) => {
                    if (disabledDates?.[day.dateString]?.disabled) {
                      Alert.alert(
                        "Not Available",
                        "This date is not available."
                      );
                      return;
                    }
                    setSelectedDate(day.dateString);
                  }}
                  theme={{
                    todayTextColor: "#2E7D32",
                    arrowColor: "#2E7D32",
                    selectedDayBackgroundColor: "#2E7D32",
                  }}
                  style={styles.calendarStyle}
                />
              </View>

              <View style={styles.inputGrid}>
                <View
                  style={[styles.bookingCard, { flex: 1, marginRight: 8 }]}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons name="time" size={18} color="#2E7D32" />
                    <Text style={styles.cardTitle}>Time</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.timeSelector}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.timeVal}>
                      {selectedTime.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[styles.bookingCard, { flex: 1, marginLeft: 8 }]}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons name="people" size={18} color="#2E7D32" />
                    <Text style={styles.cardTitle}>Guests</Text>
                  </View>
                  <View style={styles.guestCounter}>
                    <TouchableOpacity
                      onPress={() =>
                        setGuestCount(Math.max(1, guestCount - 1))
                      }
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>

                    <Text style={styles.guestCountText}>{guestCount}</Text>

                    <TouchableOpacity
                      onPress={() => setGuestCount(guestCount + 1)}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={24}
                        color="#2E7D32"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={false}
                  onChange={(e, date) => {
                    setShowTimePicker(false);
                    if (date) setSelectedTime(date);
                  }}
                />
              )}

              <LinearGradient
                colors={["#2E7D32", "#1B5E20"]}
                style={styles.mSummaryCard}
              >
                <View>
                  <Text style={styles.mTotalLabel}>Grand Total</Text>
                  <Text style={styles.mTotalVal}>
                    LKR {(Number(exp?.price || 0) * guestCount).toLocaleString()}
                  </Text>
                </View>
                <Ionicons
                  name="receipt"
                  size={30}
                  color="rgba(255,255,255,0.2)"
                />
              </LinearGradient>

              <TouchableOpacity
                style={[
                  styles.mConfirmBtn,
                  (!selectedDate || disabledDates?.[selectedDate]?.disabled) && {
                    backgroundColor: "#EEE",
                  },
                ]}
                onPress={handleConfirmBooking}
                disabled={
                  isBooking ||
                  !selectedDate ||
                  disabledDates?.[selectedDate]?.disabled
                }
              >
                {isBooking ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.mConfirmText}>Confirm & Request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const fullMarkdownStyles = {
  body: { color: "white", fontSize: 16, lineHeight: 24 },
  strong: { color: "#FFA000", fontWeight: "bold" },
  paragraph: { color: "white", fontSize: 16, lineHeight: 24, marginTop: 0 },
  bullet_list: { marginTop: 6, marginBottom: 6 },
  ordered_list: { marginTop: 6, marginBottom: 6 },
  list_item: { color: "white" },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F5",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },

  heroContainer: {
    width,
    height: HERO_HEIGHT,
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 96,
    paddingTop: 42,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  catBadge: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  catText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  ratingBadge: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  ratingText: {
    fontWeight: "800",
    fontSize: 11,
    color: "#0F172A",
  },
  vrBadge: {
    backgroundColor: "rgba(0,0,0,0.58)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  vrBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  scrollContent: {
    paddingBottom: 104,
  },

  contentBody: {
    marginTop: -10,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    backgroundColor: "#F4F7F5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  mainTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#102118",
    marginBottom: 14,
    lineHeight: 28,
  },

  hostCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E7EFEA",
    marginBottom: 14,
  },
  expertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  hostAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  expertLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 2,
  },
  expertName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  summaryBox: {
    backgroundColor: "#F6FBF7",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2F1E5",
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2E7D32",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  summaryText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },

  infoGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  metaMiniCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7EFEA",
  },
  metaMiniLabel: {
    marginTop: 8,
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },
  metaMiniValue: {
    marginTop: 4,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "800",
  },

  sectionBlock: {
    marginTop: 14,
  },
  subHeading: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1B5E20",
    marginBottom: 12,
  },
  metaText: {
    flex: 1,
    fontSize: 14,
    color: "#475569",
    lineHeight: 21,
  },

  locationTextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },

  locationMapCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D8F0DF",
  },
  mapGradient: {
    minHeight: 138,
    padding: 14,
  },
  mapTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapBadgeText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
  },
  mapOpenPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapOpenText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
  },
  mapCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapPinCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2E7D32",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mapBottomText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  generalAreaNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ECFDF3",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D8F0DF",
  },
  generalAreaText: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },

  previewCompactCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E7EFEA",
    minHeight: 112,
  },
  previewCompactImage: {
    width: 104,
    height: "100%",
    resizeMode: "cover",
  },
  previewCompactContent: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
  },
  previewCompactTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewSmallIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
  },
  previewCompactTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  previewCompactSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },

  aiCard: {
    borderRadius: 22,
    padding: 18,
    elevation: 4,
  },
  aiCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  aiTextPart: {
    flex: 1,
  },
  aiCardTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  aiCardDesc: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    lineHeight: 19,
  },
  aiMicBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#FFA000",
    justifyContent: "center",
    alignItems: "center",
  },
  aiMicBtnActive: {
    backgroundColor: "#FF5252",
  },

  historyCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7EFEA",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  historySub: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },

  voiceOverlay: {
    flex: 1,
  },
  voiceOverlayGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  voiceCenterContent: {
    width: "92%",
    alignItems: "center",
  },
  pulseContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  micCircleActive: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFA000",
    justifyContent: "center",
    alignItems: "center",
  },
  pulseCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 160, 0, 0.3)",
  },
  voiceStatusText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
  voiceSubText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },

  processingTranscriptCard: {
    marginTop: 18,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  processingTranscriptLabel: {
    color: "#FFA000",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  processingTranscriptText: {
    color: "white",
    fontSize: 15,
    lineHeight: 22,
    fontStyle: "italic",
  },

  fullScreenResult: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 16,
    maxHeight: height * 0.68,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  transcriptCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  transcriptHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  transcriptLabel: {
    color: "#FFA000",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  transcriptText: {
    color: "white",
    fontSize: 17,
    lineHeight: 25,
    fontStyle: "italic",
  },
  assistantMetaPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  assistantMetaPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  aiResultDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 15,
  },
  resultScroll: {
    flexGrow: 0,
  },
  answerCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  aiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  aiHeaderLabel: {
    color: "#FFA000",
    fontSize: 14,
    fontWeight: "bold",
  },
  tryAskCard: {
    marginTop: 14,
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tryAskTitle: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  tryAskText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 19,
  },
  viewHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  viewHistoryBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  askAgainHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  voiceCloseBtn: {
    position: "absolute",
    bottom: 40,
  },

  footerSticky: {
    position: "absolute",
    bottom: 0,
    width,
    backgroundColor: "rgba(244,247,245,0.98)",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 18 : 10,
    borderTopWidth: 1,
    borderTopColor: "#E6ECE8",
  },
  bookActionBtnFull: {
    backgroundColor: "#2E7D32",
    height: 58,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    elevation: 6,
    shadowColor: "#2E7D32",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  priceContainer: {
    justifyContent: "center",
    alignItems: "flex-start",
  },
  footerPriceText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },
  footerSubText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
  },
  footerSeparator: {
    width: 1,
    height: "54%",
    backgroundColor: "rgba(255,255,255,0.22)",
    marginHorizontal: 12,
  },
  bookNowContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bookNowText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    height: height * 0.88,
  },
  mHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 15,
  },
  mHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  mHeader: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
  },

  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  calendarStyle: {
    borderRadius: 12,
    paddingBottom: 10,
  },

  inputGrid: {
    flexDirection: "row",
    marginBottom: 5,
  },
  timeSelector: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  timeVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2E7D32",
  },

  guestCounter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  guestCountText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#333",
  },

  mSummaryCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  mTotalLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
  mTotalVal: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "900",
  },

  mConfirmBtn: {
    backgroundColor: "#2E7D32",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
  },
  mConfirmText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
});