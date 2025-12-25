import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/theme';

export default function Index() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user && userProfile) {
        // Route based on user type
        if (userProfile.userType === 'tourist') {
          router.replace('/(tourist)/dashboard');
        } else if (userProfile.userType === 'hotel') {
          router.replace('/(hotel)/dashboard');
        }
      } else {
        router.replace('/auth/login');
      }
    }
  }, [user, userProfile, loading]);

  return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
  );
}