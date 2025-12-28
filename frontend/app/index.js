import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/theme';

export default function Index() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    // Wait until the loading state is finished
    if (!loading) {
      if (user && userProfile) {
        
        // 1. Route for Tourist
        if (userProfile.userType === 'tourist') {
          router.replace('/(tourist)/dashboard');
        } 
        // 2. Route for Hotel Owner
        else if (userProfile.userType === 'hotel') {
          router.replace('/(hotel)/dashboard');
        }
        // 3. Route for Local Villager (Host) - ADDED THIS
        else if (userProfile.userType === 'host') {
          // If your host dashboard is inside (host) folder, use this path:
          router.replace('/(host)/manage-culture');
        }
        
      } else {
        // If no user is logged in, or profile is missing, go to Login
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