import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // This will throw if email/password are wrong
            await login(email, password);

            setLoading(false);

            // Go to root – your app/index.js will then redirect based on userProfile.userType
            router.replace('/');
        } catch (error) {
            setLoading(false);
            Alert.alert('Login Failed', error.message || 'Something went wrong');
        }
    };


    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={[Colors.primary, Colors.accent, Colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo Section */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoCircle}>
                            <Text style={styles.logoText}>🇱🇰</Text>
                        </View>
                        <Text style={styles.appTitle}>CeylonMate</Text>
                        <Text style={styles.appSubtitle}>Your Smart Tourism Companion</Text>
                    </View>

                    {/* Login Form */}
                    <View style={styles.formContainer}>
                        <Text style={styles.welcomeText}>Welcome Back!</Text>
                        <Text style={styles.instructionText}>Login to continue your journey</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor={Colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor={Colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <Text style={styles.loginButtonText}>
                                {loading ? 'Logging in...' : 'Login'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <View style={styles.signupContainer}>
                            <Text style={styles.signupText}>Don&#39;t have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/auth/register')}>
                                <Text style={styles.signupLink}>Sign Up</Text>
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
        paddingVertical: Spacing.xl * 2,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoText: {
        fontSize: 50,
    },
    appTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: Colors.surface,
        marginBottom: Spacing.xs,
    },
    appSubtitle: {
        fontSize: 16,
        color: Colors.surface,
        opacity: 0.9,
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
    welcomeText: {
        ...Typography.h2,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    instructionText: {
        ...Typography.caption,
        marginBottom: Spacing.lg,
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: Spacing.lg,
    },
    forgotPasswordText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    loginButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: Colors.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    dividerText: {
        marginHorizontal: Spacing.md,
        color: Colors.textSecondary,
        fontSize: 14,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    signupLink: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
});