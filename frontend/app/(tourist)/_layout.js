// ============================================================
// FILE: app/(tourist)/_layout.js  — UPDATED VERSION
// Added: artifact-scanner as hidden route
// ============================================================

import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TouristLayout() {
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
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="itinerary"
                options={{
                    title: 'Itinerary',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="map" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="risk"
                options={{
                    title: 'Risk Zone',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="alert-circle" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="place"
                options={{
                    title: 'Place',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="location" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="culture"
                options={{
                    title: 'Culture',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={size} color={color} />
                    ),
                }}
            />

            {/* ── EXISTING HIDDEN ROUTES ── */}
            <Tabs.Screen name="profile"            options={{ href: null }} />
            <Tabs.Screen name="itinerary-results"  options={{ href: null }} />
            <Tabs.Screen name="risk-alternatives"  options={{ href: null }} />
            <Tabs.Screen name="place-chat"         options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="3d-model"           options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="emergency-alert"    options={{ href: null }} />
            <Tabs.Screen name="emergency-map"      options={{ href: null }} />
            <Tabs.Screen name="facts"              options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="map"                options={{ href: null, tabBarStyle: { display: 'none' } }} />

            {/* ── KNOWLEDGE GRAPH HIDDEN ROUTES ── */}
            <Tabs.Screen name="knowledge-graph"    options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="kg-site-detail"     options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="kg-search"          options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="kg-explore"         options={{ href: null, tabBarStyle: { display: 'none' } }} />

            {/* ── NEW: ARTIFACT SCANNER (hidden, no tab bar) ── */}
            <Tabs.Screen
                name="artifact-scanner"
                options={{ href: null, tabBarStyle: { display: 'none' } }}
            />

        </Tabs>
    );
}