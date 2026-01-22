import { useSwipeContext } from '@/components/SwipeContext';
import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDuration } from '@/lib/utils';
import { Play, FolderInput, BarChart3 } from 'lucide-react-native';
import * as React from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const ACTION_WIDTH = 70;

interface TopicItemProps {
    topic: string;
    totalTime: number;
    sessionCount: number;
    lastSession: string;
    onStart: (topic: string) => void;
    onAnalytics: (topic: string) => void;
    onDelete: (topic: string) => void;
    onMove?: (topic: string) => void;
}

export function TopicItem({
    topic,
    totalTime,
    sessionCount,
    lastSession,
    onStart,
    onAnalytics,
    onDelete,
    onMove,
}: TopicItemProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const translateX = useSharedValue(0);
    const isOpen = useSharedValue(false);
    const { registerOpenItem, closeCurrent } = useSwipeContext() || {};

    const handleClose = () => {
        translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
        isOpen.value = false;
    };

    const handleRegisterOpen = () => {
        if (registerOpenItem) {
            registerOpenItem(topic, handleClose);
        }
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            if (isOpen.value) {
                // If open (at ACTION_WIDTH), allow dragging left to close (towards 0)
                const target = ACTION_WIDTH + event.translationX;
                translateX.value = Math.max(0, Math.min(ACTION_WIDTH, target));
            } else {
                // Closed state - only swipe right (positive)
                const val = event.translationX;
                translateX.value = Math.max(0, Math.min(ACTION_WIDTH, val));
            }
        })
        .onEnd((event) => {
            // Continue (Swipe Right -> Left side exposed) - translateX positive
            if (translateX.value > ACTION_WIDTH / 2 || event.velocityX > 500) {
                translateX.value = withTiming(ACTION_WIDTH, { duration: 200 });
                isOpen.value = true;
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                runOnJS(handleRegisterOpen)();
            } else {
                translateX.value = withTiming(0, { duration: 200 });
                isOpen.value = false;
            }
        });

    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            if (isOpen.value) {
                runOnJS(handleClose)();
            }
        });

    const longPressGesture = Gesture.LongPress()
        .minDuration(2000)
        .onStart(() => {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
            runOnJS(onStart)(topic);
        });

    const gesture = Gesture.Race(
        panGesture,
        Gesture.Exclusive(longPressGesture, tapGesture)
    );

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    // Continue Action (Right Swipe -> Reveals Left Side)
    // Interpolate on Positive values [0, 70]
    const continueStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, ACTION_WIDTH], [0, 1]),
        transform: [{ translateX: interpolate(translateX.value, [0, ACTION_WIDTH], [-ACTION_WIDTH, 0]) }]
    }));

    const handleContinue = () => {
        handleClose();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onStart(topic);
    };

    const formatLastSession = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <View style={styles.container}>
            {/* Continue action (Left side, revealed by Right Swipe) */}
            <Animated.View
                style={[
                    continueStyle,
                    styles.actionButton,
                    { left: 0, backgroundColor: colors.primary, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
                ]}
            >
                <Pressable onPress={handleContinue} style={styles.actionPressable}>
                    <Play size={18} color="#fff" fill="#fff" />
                </Pressable>
            </Animated.View>

            {/* Card */}
            <GestureDetector gesture={gesture}>
                <Animated.View
                    style={[
                        cardStyle,
                        styles.card,
                        { backgroundColor: colors.muted },
                    ]}
                >
                    <View style={styles.playIcon}>
                        <Play size={14} color={colors.primary} fill={colors.primary} />
                    </View>
                    <View style={styles.content}>
                        <Text style={[styles.topicName, { color: colors.foreground }]} numberOfLines={1}>
                            {topic}
                        </Text>
                        <Text variant="muted" style={styles.stats}>
                            {formatDuration(totalTime)} · {sessionCount} sessions · {formatLastSession(lastSession)}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {onMove && (
                            <Pressable
                                onPress={() => onMove(topic)}
                                style={[styles.analyticsButton, { backgroundColor: `${colors.primary}20` }]}
                            >
                                <FolderInput size={16} color={colors.primary} />
                            </Pressable>
                        )}
                        <Pressable
                            onPress={() => onAnalytics(topic)}
                            style={[styles.analyticsButton, { backgroundColor: `${colors.primary}20` }]}
                        >
                            <BarChart3 size={16} color={colors.primary} />
                        </Pressable>
                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 8,
        marginLeft: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    actionButton: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: ACTION_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionPressable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingLeft: 14,
        borderRadius: 12,
        gap: 10,
    },
    playIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(20, 184, 166, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    topicName: {
        fontSize: 14,
        fontWeight: '500',
    },
    stats: {
        fontSize: 11,
        marginTop: 2,
    },
    analyticsButton: {
        padding: 8,
        borderRadius: 8,
    },
});
