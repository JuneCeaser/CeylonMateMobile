import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";
import { Colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

export default function HostLayout() {
  const { userProfile } = useAuth();

  const profileInitial = (userProfile?.name || "H").trim().charAt(0).toUpperCase();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="manage-culture"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="booking-request"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ai-questions"
        options={{
          title: "AI Questions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="help-circle" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => {
            if (userProfile?.profileImage) {
              return (
                <Image
                  source={{ uri: userProfile.profileImage }}
                  style={{
                    width: focused ? 26 : 24,
                    height: focused ? 26 : 24,
                    borderRadius: focused ? 13 : 12,
                    borderWidth: focused ? 2 : 1.5,
                    borderColor: focused ? Colors.primary : "#D1D5DB",
                  }}
                />
              );
            }

            return (
              <View
                style={{
                  width: focused ? 26 : 24,
                  height: focused ? 26 : 24,
                  borderRadius: focused ? 13 : 12,
                  backgroundColor: focused ? Colors.primary + "20" : "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: focused ? 1.5 : 1,
                  borderColor: focused ? Colors.primary : "#D1D5DB",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: focused ? Colors.primary : "#6B7280",
                  }}
                >
                  {profileInitial}
                </Text>
              </View>
            );
          },
        }}
      />

      <Tabs.Screen name="add-culture" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
    </Tabs>
  );
}