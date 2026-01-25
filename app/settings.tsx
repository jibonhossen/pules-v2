import { SyncStatusCard } from '@/components/SyncStatusCard';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
    Bell,
    ChevronLeft,
    HelpCircle,
    Info,
    LogIn,
    LogOut,
    Mail,
    Moon,
    Shield,
    User,
} from 'lucide-react-native';
import * as React from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { signOut, isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();

    const [isSigningOut, setIsSigningOut] = React.useState(false);

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSigningOut(true);
                        try {
                            await signOut();
                            // Stay on settings page, user can continue using app offline
                        } catch (error) {
                            console.error('Sign out error:', error);
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        } finally {
                            setIsSigningOut(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSignIn = () => {
        router.push('/(auth)/sign-in');
    };

    const styles = createStyles(colors, isDark);

    const SettingsItem = ({
        icon: Icon,
        label,
        value,
        onPress,
        showArrow = true,
        destructive = false,
        rightElement,
    }: {
        icon: React.ElementType;
        label: string;
        value?: string;
        onPress?: () => void;
        showArrow?: boolean;
        destructive?: boolean;
        rightElement?: React.ReactNode;
    }) => (
        <Pressable
            style={({ pressed }) => [
                styles.settingsItem,
                pressed && styles.settingsItemPressed,
            ]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.settingsItemLeft}>
                <View
                    style={[
                        styles.iconContainer,
                        { backgroundColor: destructive ? 'rgba(220, 38, 38, 0.1)' : `${colors.primary}15` },
                    ]}
                >
                    <Icon
                        size={20}
                        color={destructive ? colors.destructive : colors.primary}
                    />
                </View>
                <Text
                    style={[
                        styles.settingsItemLabel,
                        destructive && { color: colors.destructive },
                    ]}
                >
                    {label}
                </Text>
            </View>
            <View style={styles.settingsItemRight}>
                {value && <Text style={styles.settingsItemValue}>{value}</Text>}
                {rightElement}
                {showArrow && onPress && (
                    <ChevronLeft
                        size={18}
                        color={colors.mutedForeground}
                        style={{ transform: [{ rotate: '180deg' }] }}
                    />
                )}
            </View>
        </Pressable>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top }]}
        >
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <ChevronLeft size={24} color={colors.foreground} />
                </Pressable>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.headerRight} />
            </View>

            {/* User Profile Card */}
            <View style={styles.profileCard}>
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGradient}
                >
                    <Text style={styles.avatarText}>
                        {user?.firstName?.[0]?.toUpperCase() ||
                            user?.username?.[0]?.toUpperCase() ||
                            user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
                            'U'}
                    </Text>
                </LinearGradient>
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>
                        {user?.firstName
                            ? `${user.firstName} ${user.lastName || ''}`
                            : user?.username || 'User'}
                    </Text>
                    <Text style={styles.profileEmail}>
                        {user?.emailAddresses?.[0]?.emailAddress || 'No email'}
                    </Text>
                </View>
            </View>

            {/* Account Section - Only show if signed in */}
            {isSignedIn && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.sectionContent}>
                        <SettingsItem
                            icon={User}
                            label="Edit Profile"
                            onPress={() => { }}
                        />
                        <SettingsItem
                            icon={Mail}
                            label="Email"
                            value={user?.emailAddresses?.[0]?.emailAddress?.slice(0, 20) + '...' || 'Not set'}
                            showArrow={false}
                        />
                        <SettingsItem
                            icon={Shield}
                            label="Privacy"
                            onPress={() => { }}
                        />
                    </View>
                </View>
            )}

            {/* Cloud Sync Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cloud Sync</Text>
                <SyncStatusCard />
            </View>

            {/* Preferences Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={styles.sectionContent}>
                    <SettingsItem
                        icon={Bell}
                        label="Notifications"
                        onPress={() => { }}
                    />
                    <SettingsItem
                        icon={Moon}
                        label="Theme"
                        value={isDark ? 'Dark' : 'Light'}
                        showArrow={false}
                    />
                </View>
            </View>

            {/* Support Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Support</Text>
                <View style={styles.sectionContent}>
                    <SettingsItem
                        icon={HelpCircle}
                        label="Help & FAQ"
                        onPress={() => { }}
                    />
                    <SettingsItem
                        icon={Info}
                        label="About"
                        value="v1.0.0"
                        showArrow={false}
                    />
                </View>
            </View>

            {/* Sign In / Sign Out */}
            <View style={styles.section}>
                <View style={styles.sectionContent}>
                    {isSignedIn ? (
                        <Pressable
                            style={({ pressed }) => [
                                styles.signOutButton,
                                pressed && styles.signOutButtonPressed,
                            ]}
                            onPress={handleSignOut}
                            disabled={isSigningOut}
                        >
                            {isSigningOut ? (
                                <ActivityIndicator color={colors.destructive} />
                            ) : (
                                <>
                                    <LogOut size={20} color={colors.destructive} />
                                    <Text style={styles.signOutText}>Sign Out</Text>
                                </>
                            )}
                        </Pressable>
                    ) : (
                        <Pressable
                            style={({ pressed }) => [
                                styles.signInButton,
                                pressed && styles.signInButtonPressed,
                            ]}
                            onPress={handleSignIn}
                        >
                            <LogIn size={20} color={colors.primary} />
                            <Text style={styles.signInText}>Sign In</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
    );
}

const createStyles = (colors: typeof PULSE_COLORS.dark, isDark: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        contentContainer: {
            paddingBottom: 40,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.6)' : 'rgba(0, 0, 0, 0.05)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerTitle: {
            fontSize: 18,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.foreground,
        },
        headerRight: {
            width: 40,
        },
        profileCard: {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 20,
            marginTop: 16,
            marginBottom: 24,
            padding: 20,
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
        },
        avatarGradient: {
            width: 60,
            height: 60,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            fontSize: 24,
            fontFamily: 'Poppins_700Bold',
            color: colors.primaryForeground,
        },
        profileInfo: {
            marginLeft: 16,
            flex: 1,
        },
        profileName: {
            fontSize: 18,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.foreground,
        },
        profileEmail: {
            fontSize: 14,
            fontFamily: 'Poppins_400Regular',
            color: colors.mutedForeground,
            marginTop: 2,
        },
        section: {
            marginTop: 8,
            marginHorizontal: 20,
        },
        sectionTitle: {
            fontSize: 13,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.mutedForeground,
            marginBottom: 8,
            marginLeft: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        sectionContent: {
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
        },
        settingsItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        settingsItemPressed: {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        },
        settingsItemLeft: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        iconContainer: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        settingsItemLabel: {
            fontSize: 16,
            fontFamily: 'Poppins_500Medium',
            color: colors.foreground,
        },
        settingsItemRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        settingsItemValue: {
            fontSize: 14,
            fontFamily: 'Poppins_400Regular',
            color: colors.mutedForeground,
        },
        signOutButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
            gap: 10,
        },
        signOutButtonPressed: {
            backgroundColor: isDark ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.05)',
        },
        signOutText: {
            fontSize: 16,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.destructive,
        },
        signInButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
            gap: 10,
        },
        signInButtonPressed: {
            backgroundColor: isDark ? `${colors.primary}15` : `${colors.primary}10`,
        },
        signInText: {
            fontSize: 16,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.primary,
        },
    });
