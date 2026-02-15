import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/theme';

export default function Index() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    // Wait briefly, then check status
    const timer = setTimeout(() => {
        if (!loading) {
            if (user && userProfile) {
                // If we somehow have a user, go to their dashboard
                if (userProfile.userType === 'tourist') {
                    router.replace('/(tourist)/dashboard');
                } else if (userProfile.userType === 'hotel') {
                    router.replace('/(hotel)/dashboard');
                }
            } else {
                // 👇 NO USER FOUND? GO TO LOGIN SCREEN
                router.replace('/auth/login');
            }
        }
    }, 500); // 0.5s delay to prevent flicker

    return () => clearTimeout(timer);
  }, [user, userProfile, loading]);

  return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{marginTop: 20, color: '#666'}}>Starting CeylonMate...</Text>
      </View>
  );
}