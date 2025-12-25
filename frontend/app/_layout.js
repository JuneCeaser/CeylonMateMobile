import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { PaperProvider } from 'react-native-paper';

export default function RootLayout() {
    return (
        <AuthProvider>
            <PaperProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="auth/login" />
                    <Stack.Screen name="auth/register" />
                    <Stack.Screen name="(tourist)" />
                    <Stack.Screen name="(hotel)" />
                </Stack>
            </PaperProvider>
        </AuthProvider>
    );
}



