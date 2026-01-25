import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BarChart3, FolderOpen, Clock } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabItem({
    route,
    index,
    state,
    descriptors,
    navigation,
    colors
}: {
    route: any;
    index: number;
    state: any;
    descriptors: any;
    navigation: any;
    colors: typeof PULSE_COLORS.dark;
}) {
    const { options } = descriptors[route.key];
    const label =
        options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
                ? options.title
                : route.name;

    const isFocused = state.index === index;

    // Map route names to icons
    const Icon = React.useMemo(() => {
        switch (route.name) {
            case 'index': return Clock;
            case 'folders': return FolderOpen;
            case 'reports': return BarChart3;
            default: return Clock;
        }
    }, [route.name]);

    const onPress = () => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(route.name, route.params);
        }
    };

    const onLongPress = () => {
        navigation.emit({
            type: 'tabLongPress',
            target: route.key,
        });
    };

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={{ color: 'transparent' }}
            style={({ pressed }) => [
                styles.tabItem,
                { opacity: pressed ? 0.7 : 1 }
            ]}
        >
            <View
                style={[
                    styles.tabContent,
                    isFocused && {
                        backgroundColor: `${colors.primary}15`,
                        borderRadius: 16,
                        overflow: 'hidden',
                    },
                ]}
            >
                <Icon
                    size={22}
                    color={isFocused ? colors.primary : colors.mutedForeground}
                    strokeWidth={isFocused ? 2.5 : 2}
                />
                <Text
                    style={[
                        styles.tabLabel,
                        { color: isFocused ? colors.primary : colors.mutedForeground },
                        isFocused && styles.tabLabelActive,
                    ]}
                >
                    {label}
                </Text>
            </View>
        </Pressable>
    );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const insets = useSafeAreaInsets();

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
            {state.routes.map((route, index) => (
                <TabItem
                    key={route.key}
                    route={route}
                    index={index}
                    state={state}
                    descriptors={descriptors}
                    navigation={navigation}
                    colors={colors}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingTop: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 0,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        overflow: 'hidden',
        gap: 4,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '500'
    },
    tabLabelActive: {
        fontWeight: '600',
    },
});
