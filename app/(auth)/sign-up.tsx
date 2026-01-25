import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWarmUpBrowser } from '@/hooks/useWarmUpBrowser';
import { useSignUp, useSSO } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react-native';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession();

export default function SignUpPage() {
    useWarmUpBrowser();

    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';

    const { isLoaded, signUp, setActive } = useSignUp();
    const { startSSOFlow } = useSSO();
    const router = useRouter();

    const [emailAddress, setEmailAddress] = React.useState('');
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [pendingVerification, setPendingVerification] = React.useState(false);
    const [code, setCode] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    // Email/Password sign up
    const onSignUpPress = async () => {
        if (!isLoaded) return;

        setIsLoading(true);
        setError('');

        try {
            await signUp.create({
                emailAddress,
                username,
                password,
            });

            // Send verification code
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            setPendingVerification(true);
        } catch (err: any) {
            console.error(JSON.stringify(err, null, 2));
            const errorMessage = err?.errors?.[0]?.message || 'Sign up failed. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Verify email code
    const onVerifyPress = async () => {
        if (!isLoaded) return;

        setIsLoading(true);
        setError('');

        try {
            const signUpAttempt = await signUp.attemptEmailAddressVerification({ code });

            if (signUpAttempt.status === 'complete') {
                await setActive({ session: signUpAttempt.createdSessionId });
                router.replace('/(tabs)');
            } else {
                console.error(JSON.stringify(signUpAttempt, null, 2));
                setError('Verification incomplete. Please try again.');
            }
        } catch (err: any) {
            console.error(JSON.stringify(err, null, 2));
            const errorMessage = err?.errors?.[0]?.message || 'Invalid verification code';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Google OAuth sign up
    const onGoogleSignUp = React.useCallback(async () => {
        if (!startSSOFlow) {
            setError('Google sign up is not available');
            return;
        }

        setIsGoogleLoading(true);
        setError('');

        try {
            // Use the app scheme for proper redirect
            const redirectUrl = AuthSession.makeRedirectUri({
                scheme: 'pulesexpo',
                path: 'oauth-callback',
            });

            console.log('OAuth redirect URL:', redirectUrl);

            const { createdSessionId, setActive: setActiveSession, signIn: ssoSignIn, signUp: ssoSignUp } = await startSSOFlow({
                strategy: 'oauth_google',
                redirectUrl,
            });

            if (createdSessionId && setActiveSession) {
                await setActiveSession({ session: createdSessionId });
                router.replace('/(tabs)');
            } else {
                // Handle case where OAuth completed but no session was created
                const status = ssoSignIn?.status || ssoSignUp?.status;
                console.log('OAuth status:', status);

                if (status === 'complete') {
                    setError('Authentication completed but failed to create session. Please try again.');
                } else {
                    setError('Additional steps required. Please try email sign up.');
                }
            }
        } catch (err: any) {
            console.error('Google OAuth error:', JSON.stringify(err, null, 2));
            const errorMessage = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Google sign up failed. Please make sure Google is enabled in Clerk.';
            setError(errorMessage);
        } finally {
            setIsGoogleLoading(false);
        }
    }, [startSSOFlow, router]);

    const styles = createStyles(colors, isDark);

    // Verification screen
    if (pendingVerification) {
        return (
            <LinearGradient
                colors={isDark ? ['#09090b', '#0d1b19', '#09090b'] : ['#fafafa', '#e6f7f5', '#fafafa']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.logoContainer}>
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    style={styles.logoGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <ShieldCheck size={40} color={colors.primaryForeground} />
                                </LinearGradient>
                            </View>
                            <Text style={styles.title}>Verify Email</Text>
                            <Text style={styles.subtitle}>
                                We've sent a verification code to{'\n'}
                                <Text style={styles.emailHighlight}>{emailAddress}</Text>
                            </Text>
                        </View>

                        {/* Error Message */}
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Verification Form */}
                        <View style={styles.formContainer}>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.input, styles.codeInput]}
                                    placeholder="Enter verification code"
                                    placeholderTextColor={colors.mutedForeground}
                                    value={code}
                                    onChangeText={setCode}
                                    keyboardType="number-pad"
                                    textAlign="center"
                                />
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.signInButton,
                                    !code && styles.buttonDisabled,
                                    pressed && styles.buttonPressed,
                                ]}
                                onPress={onVerifyPress}
                                disabled={!code || isLoading}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    style={styles.buttonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={colors.primaryForeground} />
                                    ) : (
                                        <Text style={styles.signInButtonText}>Verify Email</Text>
                                    )}
                                </LinearGradient>
                            </Pressable>

                            <Pressable
                                style={styles.resendButton}
                                onPress={() => setPendingVerification(false)}
                            >
                                <Text style={styles.resendText}>← Go back</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        );
    }

    // Sign up screen
    return (
        <LinearGradient
            colors={isDark ? ['#09090b', '#0d1b19', '#09090b'] : ['#fafafa', '#e6f7f5', '#fafafa']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.logoGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.logoText}>P</Text>
                            </LinearGradient>
                        </View>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Start your productivity journey today</Text>
                    </View>

                    {/* Error Message */}
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Form */}
                    <View style={styles.formContainer}>
                        {/* Email Input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIconContainer}>
                                <Mail size={20} color={colors.mutedForeground} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Email address"
                                placeholderTextColor={colors.mutedForeground}
                                value={emailAddress}
                                onChangeText={setEmailAddress}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>

                        {/* Username Input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIconContainer}>
                                <User size={20} color={colors.mutedForeground} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Username"
                                placeholderTextColor={colors.mutedForeground}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoComplete="username"
                            />
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIconContainer}>
                                <Lock size={20} color={colors.mutedForeground} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Password (min. 8 characters)"
                                placeholderTextColor={colors.mutedForeground}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <Pressable
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff size={20} color={colors.mutedForeground} />
                                ) : (
                                    <Eye size={20} color={colors.mutedForeground} />
                                )}
                            </Pressable>
                        </View>

                        {/* Sign Up Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.signInButton,
                                (!emailAddress || !username || !password || isLoading) && styles.buttonDisabled,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={onSignUpPress}
                            disabled={!emailAddress || !username || !password || isLoading}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={colors.primaryForeground} />
                                ) : (
                                    <Text style={styles.signInButtonText}>Create Account</Text>
                                )}
                            </LinearGradient>
                        </Pressable>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.divider} />
                        </View>

                        {/* Google Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.googleButton,
                                pressed && styles.buttonPressed,
                                isGoogleLoading && styles.buttonDisabled,
                            ]}
                            onPress={onGoogleSignUp}
                            disabled={isGoogleLoading}
                        >
                            {isGoogleLoading ? (
                                <ActivityIndicator color={colors.foreground} />
                            ) : (
                                <>
                                    <GoogleIcon />
                                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                                </>
                            )}
                        </Pressable>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Link href="/(auth)/sign-in" asChild>
                            <Pressable>
                                <Text style={styles.linkText}>Sign in</Text>
                            </Pressable>
                        </Link>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

// Google Icon component
function GoogleIcon() {
    return (
        <View style={{ width: 20, height: 20, marginRight: 12 }}>
            <Text style={{ fontSize: 18 }}>🔵</Text>
        </View>
    );
}

const createStyles = (colors: typeof PULSE_COLORS.dark, isDark: boolean) =>
    StyleSheet.create({
        gradient: {
            flex: 1,
        },
        container: {
            flex: 1,
        },
        scrollContent: {
            flexGrow: 1,
            justifyContent: 'center',
            padding: 24,
        },
        header: {
            alignItems: 'center',
            marginBottom: 40,
        },
        logoContainer: {
            marginBottom: 24,
        },
        logoGradient: {
            width: 80,
            height: 80,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 12,
        },
        logoText: {
            fontSize: 40,
            fontFamily: 'Poppins_700Bold',
            color: colors.primaryForeground,
        },
        title: {
            fontSize: 32,
            fontFamily: 'Poppins_700Bold',
            color: colors.foreground,
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 16,
            fontFamily: 'Poppins_400Regular',
            color: colors.mutedForeground,
            textAlign: 'center',
        },
        emailHighlight: {
            color: colors.primary,
            fontFamily: 'Poppins_600SemiBold',
        },
        errorContainer: {
            backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : 'rgba(239, 68, 68, 0.1)',
            borderWidth: 1,
            borderColor: colors.destructive,
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
        },
        errorText: {
            color: colors.destructive,
            fontFamily: 'Poppins_500Medium',
            fontSize: 14,
            textAlign: 'center',
        },
        formContainer: {
            gap: 16,
        },
        inputWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            paddingHorizontal: 16,
            height: 56,
        },
        inputIconContainer: {
            marginRight: 12,
        },
        input: {
            flex: 1,
            fontSize: 16,
            fontFamily: 'Poppins_400Regular',
            color: colors.foreground,
        },
        codeInput: {
            fontSize: 24,
            fontFamily: 'Poppins_600SemiBold',
            letterSpacing: 8,
        },
        eyeButton: {
            padding: 8,
        },
        signInButton: {
            borderRadius: 16,
            overflow: 'hidden',
            marginTop: 8,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        },
        buttonGradient: {
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        signInButtonText: {
            fontSize: 17,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.primaryForeground,
        },
        buttonPressed: {
            opacity: 0.85,
            transform: [{ scale: 0.98 }],
        },
        buttonDisabled: {
            opacity: 0.5,
        },
        resendButton: {
            alignItems: 'center',
            paddingVertical: 12,
        },
        resendText: {
            fontSize: 15,
            fontFamily: 'Poppins_500Medium',
            color: colors.primary,
        },
        dividerContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 8,
        },
        divider: {
            flex: 1,
            height: 1,
            backgroundColor: colors.border,
        },
        dividerText: {
            marginHorizontal: 16,
            fontSize: 14,
            fontFamily: 'Poppins_500Medium',
            color: colors.mutedForeground,
        },
        googleButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.6)' : 'rgba(255, 255, 255, 0.9)',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 24,
        },
        googleButtonText: {
            fontSize: 16,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.foreground,
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 32,
        },
        footerText: {
            fontSize: 15,
            fontFamily: 'Poppins_400Regular',
            color: colors.mutedForeground,
        },
        linkText: {
            fontSize: 15,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.primary,
        },
    });
