import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePathname, useRouter } from 'expo-router';
import { BarChart3, Calendar, Clock } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const TABS = [
    { name: 'index', label: 'Timer', icon: Clock, href: '/' },
    { name: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
    { name: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
] as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TabItemProps {
    tab: (typeof TABS)[number];
    isActive: boolean;
    onPress: () => void;
    colors: typeof PULSE_COLORS.dark;
}

function TabItem({ tab, isActive, onPress, colors }: TabItemProps) {
    const scale = useSharedValue(1);
    const Icon = tab.icon;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.95, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 100 });
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[animatedStyle, styles.tabItem]}
        >
            <View
                style={[
                    styles.tabContent,
                    isActive && {
                        backgroundColor: `${colors.primary}20`,
                        borderRadius: 16,
                    },
                ]}
            >
                <Icon
                    size={22}
                    color={isActive ? colors.primary : colors.mutedForeground}
                    strokeWidth={isActive ? 2.5 : 2}
                />
                <Text
                    style={[
                        styles.tabLabel,
                        { color: isActive ? colors.primary : colors.mutedForeground },
                        isActive && styles.tabLabelActive,
                    ]}
                >
                    {tab.label}
                </Text>
            </View>
        </AnimatedPressable>
    );
}

export function CustomTabBar() {
    const pathname = usePathname();
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const insets = useSafeAreaInsets();

    const getActiveTab = () => {
        if (pathname === '/' || pathname === '/index') return 'index';
        if (pathname.includes('/calendar')) return 'calendar';
        if (pathname.includes('/reports')) return 'reports';
        return 'index';
    };

    const activeTab = getActiveTab();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    paddingBottom: Math.max(insets.bottom, 12),
                },
            ]}
        >
            {TABS.map((tab) => (
                <TabItem
                    key={tab.name}
                    tab={tab}
                    isActive={activeTab === tab.name}
                    onPress={() => router.push(tab.href as any)}
                    colors={colors}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 8,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    tabLabel: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '500',
    },
    tabLabelActive: {
        fontWeight: '600',
    },
});
