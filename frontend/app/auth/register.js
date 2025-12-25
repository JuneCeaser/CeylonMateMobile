import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function RegisterScreen() {
    const router = useRouter();
    const { register } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form data
    const [userType, setUserType] = useState('tourist'); // 'tourist' or 'hotel'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('');

    // Tourist specific
    const [budgetRange, setBudgetRange] = useState('medium');
    const [activityInterests, setActivityInterests] = useState([]);

    // Hotel specific
    const [hotelName, setHotelName] = useState('');
    const [hotelAddress, setHotelAddress] = useState('');
    const [hotelCity, setHotelCity] = useState('');

    const activities = ['Cultural', 'Adventure', 'Beach', 'Wildlife', 'Nature', 'Historical'];

    const toggleActivity = (activity) => {
        if (activityInterests.includes(activity)) {
            setActivityInterests(activityInterests.filter(a => a !== activity));
        } else {
            setActivityInterests([...activityInterests, activity]);
        }
    };

    const validateStep1 = () => {
        if (!email || !password || !confirmPassword || !name) {
            Alert.alert('Error', 'Please fill in all required fields');
            return false;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (userType === 'tourist') {
            if (!country) {
                Alert.alert('Error', 'Please enter your country');
                return false;
            }
        } else {
            if (!hotelName || !hotelAddress || !hotelCity) {
                Alert.alert('Error', 'Please fill in all hotel information');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        }
    };

    const handleRegister = async () => {
        if (!validateStep2()) return;

        setLoading(true);

        const userData = {
            email,
            password,
            name,
            phone,
            userType,
            ...(userType === 'tourist'
                    ? {
                        country,
                        preferences: {
                            budgetRange,
                            activityInterests,
                        }
                    }
                    : {
                        hotelName,
                        hotelAddress,
                        hotelCity,
                    }
            ),
        };

        try {
            // CORRECT CALL — pass email, password, and cleaned userData
            const result = await register(email, password, userData);

            setLoading(false);

            Alert.alert(
                "Success",
                userType === 'hotel'
                    ? 'Registration successful! Your account is pending admin approval.'
                    : 'Registration successful! Welcome to CeylonMate.',
                [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
            );
        } catch (error) {
            setLoading(false);
            Alert.alert("Registration Failed", error.message);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={[Colors.primary, Colors.accent]}
                style={styles.gradient}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Create Account</Text>
                        <Text style={styles.headerSubtitle}>Step {step} of 2</Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: step === 1 ? '50%' : '100%' }]} />
                    </View>

                    {/* Form Container */}
                    <View style={styles.formContainer}>
                        {step === 1 && (
                            <View>
                                <Text style={styles.sectionTitle}>Account Type</Text>
                                <View style={styles.userTypeContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.userTypeButton,
                                            userType === 'tourist' && styles.userTypeButtonActive,
                                        ]}
                                        onPress={() => setUserType('tourist')}
                                    >
                                        <Text style={styles.userTypeIcon}>🧳</Text>
                                        <Text
                                            style={[
                                                styles.userTypeText,
                                                userType === 'tourist' && styles.userTypeTextActive,
                                            ]}
                                        >
                                            Tourist
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.userTypeButton,
                                            userType === 'hotel' && styles.userTypeButtonActive,
                                        ]}
                                        onPress={() => setUserType('hotel')}
                                    >
                                        <Text style={styles.userTypeIcon}>🏨</Text>
                                        <Text
                                            style={[
                                                styles.userTypeText,
                                                userType === 'hotel' && styles.userTypeTextActive,
                                            ]}
                                        >
                                            Hotel
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.sectionTitle}>Basic Information</Text>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Full Name *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your name"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Email *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your email"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Phone Number</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="+94 77 123 4567"
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Password *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Create a password"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Confirm Password *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Re-enter password"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                    />
                                </View>

                                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                                    <Text style={styles.nextButtonText}>Next →</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 2 && userType === 'tourist' && (
                            <View>
                                <Text style={styles.sectionTitle}>Travel Preferences</Text>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Country *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your country"
                                        value={country}
                                        onChangeText={setCountry}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Budget Range</Text>
                                    <View style={styles.budgetContainer}>
                                        {['low', 'medium', 'high'].map((range) => (
                                            <TouchableOpacity
                                                key={range}
                                                style={[
                                                    styles.budgetButton,
                                                    budgetRange === range && styles.budgetButtonActive,
                                                ]}
                                                onPress={() => setBudgetRange(range)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.budgetButtonText,
                                                        budgetRange === range && styles.budgetButtonTextActive,
                                                    ]}
                                                >
                                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Activity Interests</Text>
                                    <View style={styles.activitiesContainer}>
                                        {activities.map((activity) => (
                                            <TouchableOpacity
                                                key={activity}
                                                style={[
                                                    styles.activityChip,
                                                    activityInterests.includes(activity) && styles.activityChipActive,
                                                ]}
                                                onPress={() => toggleActivity(activity)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.activityChipText,
                                                        activityInterests.includes(activity) && styles.activityChipTextActive,
                                                    ]}
                                                >
                                                    {activity}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                                    onPress={handleRegister}
                                    disabled={loading}
                                >
                                    <Text style={styles.registerButtonText}>
                                        {loading ? 'Creating Account...' : 'Complete Registration'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 2 && userType === 'hotel' && (
                            <View>
                                <Text style={styles.sectionTitle}>Hotel Information</Text>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Hotel Name *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter hotel name"
                                        value={hotelName}
                                        onChangeText={setHotelName}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Address *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter hotel address"
                                        value={hotelAddress}
                                        onChangeText={setHotelAddress}
                                        multiline
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>City *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter city"
                                        value={hotelCity}
                                        onChangeText={setHotelCity}
                                    />
                                </View>

                                <View style={styles.infoBox}>
                                    <Text style={styles.infoText}>
                                        ℹ️ Your hotel account will be pending admin approval. You&#39;ll be notified once approved.
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                                    onPress={handleRegister}
                                    disabled={loading}
                                >
                                    <Text style={styles.registerButtonText}>
                                        {loading ? 'Submitting...' : 'Submit for Approval'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/auth/login')}>
                                <Text style={styles.loginLink}>Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingTop: Spacing.xl * 2,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    backButton: {
        marginBottom: Spacing.md,
    },
    backButtonText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: Spacing.xs,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.surface,
        opacity: 0.9,
    },
    progressContainer: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.lg,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.sm,
    },
    formContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl * 2,
        borderTopRightRadius: BorderRadius.xl * 2,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl * 2,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
    },
    userTypeContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    userTypeButton: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.border,
    },
    userTypeButtonActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    userTypeIcon: {
        fontSize: 32,
        marginBottom: Spacing.xs,
    },
    userTypeText: {
        fontSize: 16,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    userTypeTextActive: {
        color: Colors.primary,
    },
    inputContainer: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm * 1.5,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    budgetContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    budgetButton: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    budgetButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    budgetButtonText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    budgetButtonTextActive: {
        color: Colors.surface,
    },
    activitiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    activityChip: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    activityChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    activityChipText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    activityChipTextActive: {
        color: Colors.surface,
    },
    nextButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    nextButtonText: {
        color: Colors.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
    registerButton: {
        backgroundColor: Colors.success,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.lg,
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    registerButtonDisabled: {
        opacity: 0.6,
    },
    registerButtonText: {
        color: Colors.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoBox: {
        backgroundColor: Colors.accent + '20',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginTop: Spacing.md,
    },
    infoText: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    loginText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    loginLink: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
});