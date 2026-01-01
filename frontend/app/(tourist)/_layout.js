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
            
            {/* HIDDEN ROUTES */}
            <Tabs.Screen name="profile" options={{ href: null }} />
            <Tabs.Screen name="itinerary-results" options={{ href: null }} />
            <Tabs.Screen name="risk-alternatives" options={{ href: null }} />
            <Tabs.Screen name="place-chat" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="my-bookings" options={{ href: null }} />
        </Tabs>
    );
}