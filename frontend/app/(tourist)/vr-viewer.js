import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { WebView } from "react-native-webview";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Gyroscope } from "expo-sensors";
import * as ScreenOrientation from "expo-screen-orientation";

function pickParam(value, fallback = "") {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

const TOP_OFFSET = Platform.OS === "ios" ? 56 : 22;

export default function VRViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const webViewRef = useRef(null);
  const gyroSubRef = useRef(null);
  const overlayTimersRef = useRef([]);

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const lastTsRef = useRef(null);
  const webLoadedRef = useRef(false);

  const imageUrl = pickParam(params.imageUrl);
  const shortTitle = pickParam(params.title, "360° Cultural Preview");
  const fullTitle = pickParam(params.fullTitle, shortTitle || "360° Cultural Preview");
  const experienceId = pickParam(params.experienceId);
  const returnTo = pickParam(
    params.returnTo,
    "/(tourist)/experience-detail"
  );
  const viewerKey = pickParam(params.viewerKey);

  const actualImageUrl =
    imageUrl || "http://192.168.8.195:5000/uploads/vr360/sample-360.jpg";

  const displayTitle = fullTitle || shortTitle || "360° Cultural Preview";

  const webViewInstanceKey = useMemo(() => {
    return viewerKey || `${actualImageUrl}-${experienceId || "no-id"}`;
  }, [viewerKey, actualImageUrl, experienceId]);

  const [isLoading, setIsLoading] = useState(true);
  const [gyroAvailable, setGyroAvailable] = useState(null);
  const [gyroReady, setGyroReady] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const clearOverlayTimers = () => {
    overlayTimersRef.current.forEach(clearTimeout);
    overlayTimersRef.current = [];
  };

  const scheduleAutoHideControls = () => {
    clearOverlayTimers();

    overlayTimersRef.current.push(
      setTimeout(() => setShowControls(false), isSplitMode ? 2500 : 4000)
    );
  };

  const revealControlsTemporarily = () => {
    setShowControls(true);
    scheduleAutoHideControls();
  };

  const stopGyro = () => {
    if (gyroSubRef.current) {
      gyroSubRef.current.remove();
      gyroSubRef.current = null;
    }
  };

  const sendRotationToWeb = () => {
    if (!webLoadedRef.current || !webViewRef.current) return;

    const yaw = yawRef.current.toFixed(3);
    const pitch = pitchRef.current.toFixed(3);

    webViewRef.current.injectJavaScript(`
      if (window.setCameraRotationFromRN) {
        window.setCameraRotationFromRN(${yaw}, ${pitch});
      }
      true;
    `);
  };

  const startGyro = async () => {
    try {
      const available = await Gyroscope.isAvailableAsync();
      setGyroAvailable(available);

      if (!available) {
        setGyroReady(false);
        Alert.alert(
          "Gyroscope Not Available",
          "This device does not provide gyroscope data. You can still drag the 360° view."
        );
        return;
      }

      Gyroscope.setUpdateInterval(16);

      stopGyro();
      lastTsRef.current = Date.now();

      gyroSubRef.current = Gyroscope.addListener(({ x, y, z }) => {
        const now = Date.now();
        const dt = Math.min((now - (lastTsRef.current || now)) / 1000, 0.05);
        lastTsRef.current = now;

        yawRef.current += z * dt * 57.2958;
        pitchRef.current += x * dt * 57.2958;

        if (pitchRef.current > 85) pitchRef.current = 85;
        if (pitchRef.current < -85) pitchRef.current = -85;

        sendRotationToWeb();
      });

      setGyroReady(true);
    } catch (err) {
      console.log("Gyroscope start error:", err?.message || err);
      setGyroReady(false);
      Alert.alert(
        "Gyroscope Error",
        "Could not start gyroscope. You can still drag to rotate."
      );
    }
  };

  const resetView = () => {
    yawRef.current = 0;
    pitchRef.current = 0;
    sendRotationToWeb();
    revealControlsTemporarily();
  };

  const ensurePortrait = async () => {
    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      );
    } catch (err) {
      console.log("Orientation portrait error:", err?.message || err);
    }
  };

  const ensureLandscape = async () => {
    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    } catch (err) {
      console.log("Orientation landscape error:", err?.message || err);
    }
  };

  const toggleSplitMode = async () => {
    const next = !isSplitMode;
    setIsSplitMode(next);
    setShowControls(true);

    if (next) {
      await ensureLandscape();
    } else {
      await ensurePortrait();
    }

    scheduleAutoHideControls();
  };

  const handleBack = async () => {
    stopGyro();
    clearOverlayTimers();
    await ensurePortrait();

    if (experienceId) {
      router.replace({
        pathname: returnTo,
        params: { id: experienceId },
      });
      return;
    }

    router.replace("/(tourist)/culture");
  };

  useEffect(() => {
    setIsLoading(true);
    setGyroReady(false);
    setShowControls(true);
    setIsSplitMode(false);
    webLoadedRef.current = false;

    yawRef.current = 0;
    pitchRef.current = 0;
    lastTsRef.current = null;

    ensurePortrait();
    clearOverlayTimers();
    scheduleAutoHideControls();

    return () => {
      stopGyro();
      clearOverlayTimers();
      ensurePortrait();
    };
  }, [webViewInstanceKey]);

  const vrHtml = useMemo(
    () => `
<!DOCTYPE html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000;
      }
    </style>
  </head>
  <body>
    <a-scene
      embedded
      vr-mode-ui="enabled: false"
      loading-screen="enabled: false"
      device-orientation-permission-ui="enabled: false"
      renderer="antialias: true; colorManagement: true;"
    >
      <a-assets timeout="20000">
        <img
          id="panorama"
          src="${actualImageUrl}"
          crossorigin="anonymous"
        />
      </a-assets>

      <a-sky id="sky" src="#panorama" rotation="0 -90 0"></a-sky>
      <a-entity light="type: ambient; intensity: 1"></a-entity>

      <a-entity id="cameraRig" rotation="0 0 0">
        <a-camera
          id="mainCamera"
          position="0 1.6 0"
          look-controls="touchEnabled: true; mouseEnabled: true; magicWindowTrackingEnabled: false"
          wasd-controls="enabled: false"
        ></a-camera>
      </a-entity>
    </a-scene>

    <script>
      const img = document.getElementById("panorama");
      const cameraRig = document.getElementById("cameraRig");
      let finished = false;

      function post(msg) {
        window.ReactNativeWebView.postMessage(msg);
      }

      function success() {
        if (finished) return;
        finished = true;
        post("loaded");
      }

      function fail(reason) {
        if (finished) return;
        finished = true;
        post(reason || "error");
      }

      img.addEventListener("load", success);
      img.addEventListener("error", function () {
        fail("error");
      });

      setTimeout(function () {
        if (!finished) {
          fail("timeout");
        }
      }, 15000);

      window.setCameraRotationFromRN = function(yawDeg, pitchDeg) {
        if (!cameraRig) return;
        cameraRig.setAttribute("rotation", \`\${-pitchDeg} \${-yawDeg} 0\`);
      };
    </script>
  </body>
</html>
`,
    [actualImageUrl]
  );

  return (
    <View style={styles.container}>
      <WebView
        key={webViewInstanceKey}
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: vrHtml }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        cacheEnabled={false}
        incognito
        onMessage={async (event) => {
          const message = event.nativeEvent.data;

          if (message === "loaded") {
            setIsLoading(false);
            webLoadedRef.current = true;
            await startGyro();
          } else if (message === "error" || message === "timeout") {
            setIsLoading(false);
            Alert.alert(
              "360 Image Load Failed",
              "The panorama could not be loaded on this device. Please check the image URL and Android network settings."
            );
          }
        }}
        onError={() => {
          setIsLoading(false);
          Alert.alert("Viewer Error", "The VR viewer page failed to load.");
        }}
      />

      <Pressable style={styles.tapLayer} onPress={revealControlsTemporarily}>
        {isSplitMode && (
          <>
            <View style={styles.splitDivider} pointerEvents="none" />
            <View style={styles.leftGuide} pointerEvents="none" />
            <View style={styles.rightGuide} pointerEvents="none" />
            <View style={styles.lensCenterLeft} pointerEvents="none" />
            <View style={styles.lensCenterRight} pointerEvents="none" />
          </>
        )}

        {showControls && (
          <>
            <View style={styles.topBar} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.sideBtn}
                onPress={handleBack}
                activeOpacity={0.85}
              >
                <View style={styles.backBtnInner}>
                  <Ionicons name="arrow-back" size={20} color="white" />
                  <Text style={styles.backBtnText}>Back</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.titleWrap}>
                <Text numberOfLines={2} style={styles.titleText}>
                  {displayTitle}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sideBtn}
                onPress={resetView}
                activeOpacity={0.85}
              >
                <View style={styles.resetBtnInner}>
                  <Ionicons name="refresh" size={18} color="white" />
                  <Text style={styles.resetBtnText}>Center</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomUi} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.splitBtn}
                onPress={toggleSplitMode}
                activeOpacity={0.9}
              >
                <View style={styles.splitBtnInner}>
                  <Ionicons
                    name={isSplitMode ? "phone-portrait-outline" : "glasses-outline"}
                    size={18}
                    color="white"
                  />
                  <Text style={styles.splitBtnText}>
                    {isSplitMode ? "Exit VR" : "VR Glass"}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.hintWrap}>
                <Ionicons
                  name={
                    gyroReady
                      ? isSplitMode
                        ? "glasses-outline"
                        : "refresh-circle-outline"
                      : "hand-left-outline"
                  }
                  size={20}
                  color="white"
                />
                <Text style={styles.hintText}>
                  {gyroReady
                    ? isSplitMode
                      ? "Insert phone into VR glass and move your head"
                      : "Move phone or drag to explore"
                    : "Drag to rotate 360° view"}
                </Text>
              </View>
            </View>
          </>
        )}

        {gyroAvailable === false && (
          <View style={styles.statusWrap} pointerEvents="none">
            <Text style={styles.statusText}>Gyroscope not available</Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loaderContainer} pointerEvents="none">
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loaderText}>Loading 360° Preview...</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },

  topBar: {
    position: "absolute",
    top: TOP_OFFSET,
    left: 12,
    right: 12,
    zIndex: 40,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  sideBtn: {
    width: 88,
  },

  backBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  backBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },

  titleWrap: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.36)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    minHeight: 46,
    justifyContent: "center",
  },
  titleText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },

  resetBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  resetBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },

  bottomUi: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 20,
    zIndex: 40,
    alignItems: "center",
  },

  splitBtn: {
    marginBottom: 10,
  },
  splitBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(46,125,50,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  splitBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },

  hintWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    maxWidth: "92%",
  },
  hintText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    textAlign: "center",
    flexShrink: 1,
  },

  statusWrap: {
    position: "absolute",
    bottom: 150,
    alignSelf: "center",
    zIndex: 35,
    backgroundColor: "rgba(180,0,0,0.75)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },

  splitDivider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 3,
    left: "50%",
    marginLeft: -1.5,
    backgroundColor: "rgba(255,255,255,0.72)",
    zIndex: 25,
  },
  leftGuide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: "50%",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
    zIndex: 20,
  },
  rightGuide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "50%",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.08)",
    zIndex: 20,
  },
  lensCenterLeft: {
    position: "absolute",
    top: "50%",
    left: "25%",
    marginLeft: -8,
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    zIndex: 22,
  },
  lensCenterRight: {
    position: "absolute",
    top: "50%",
    left: "75%",
    marginLeft: -8,
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    zIndex: 22,
  },

  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  loaderText: {
    marginTop: 10,
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});