import { useSwipeContext } from '@/components/SwipeContext';
import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDuration } from '@/lib/utils';
import { ChevronDown, ChevronRight, BarChart3, Play, Trash2, FolderInput } from 'lucide-react-native';
import * as React from 'react';
import * as Haptics from 'expo-haptics';
import { Alert, Pressable, View, StyleSheet } from 'react-native';
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
                // Clamped drag from open state
                // If open at +ACTION_WIDTH (Right/Continue), dragging left reduces it
                // If open at -ACTION_WIDTH (Left/Delete), dragging right increases it
                // We use base value based on initial state
                // But simplistically:
                const offset = translateX.value > 0 ? ACTION_WIDTH : -ACTION_WIDTH;
                // This logic is tricky with state. simpler to just read translation
                // But generally we just want to limit the max extents.

                // Let's use a simpler approach: Just clamp the raw new value.
                // But event.translationX is delta from BEFORE touch.
                // if isOpen, we need to add the offset? 
                // reanimated gesture handler: translationX is total translation since gesture start.
                // So if we started at 0 (closed), it's 0+trans.
                // If we started at Open, we need to handle that.
                // Actually existing logic `if (isOpen.value) { translateX.value = event.translationX }` implies it jumps to 0?
                // No, usually you assume start is 0 unless you use context. 
                // The current code is likely buggy if isOpen is true: it sets value = event.translationX (which starts at 0).
                // So it snaps closed! (User might haven't noticed if they didn't try to drag FROM open).

                // Focusing on the "extra space" issue (drags too far):
                // We will clamp.
                // But first let's fix the logic properly.
                // Actually the current code:
                // if (isOpen) { translateX.value = event.translationX }
                // This means if it WAS open at 70, and I touch and drag 1px, it jumps to 1. 
                // That's a bug, but maybe out of scope unless it contributes.

                // I will stick to clamping the "directions".

                const val = event.translationX;
                // Clamp between -ACTION_WIDTH and ACTION_WIDTH
                // Use a slight overshoot for feel? User said "extra space" so clamp tight.
                translateX.value = Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, val));
            } else {
                // Closed state
                const val = event.translationX;
                translateX.value = Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, val));
            }
        })
        .onEnd((event) => {
            // Delete (Swipe Left -> Right side exposed) - translateX negative
            if (translateX.value < -ACTION_WIDTH / 2 || event.velocityX < -500) {
                translateX.value = withTiming(-ACTION_WIDTH, { duration: 200 });
                isOpen.value = true;
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                runOnJS(handleRegisterOpen)();

                // Continue (Swipe Right -> Left side exposed) - translateX positive
            } else if (translateX.value > ACTION_WIDTH / 2 || event.velocityX > 500) {
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

    const deleteStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, ACTION_WIDTH], [0, 1]),
        transform: [{ translateX: interpolate(translateX.value, [0, ACTION_WIDTH], [-ACTION_WIDTH, 0]) }]
    }));

    const continueStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [-ACTION_WIDTH, 0], [1, 0]),
        transform: [{ translateX: interpolate(translateX.value, [-ACTION_WIDTH, 0], [0, ACTION_WIDTH]) }]
    }));

    const handleContinue = () => {
        handleClose();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onStart(topic);
    };

    const handleDelete = () => {
        handleClose();
        Alert.alert(
            'Delete Topic',
            `Delete all sessions for "${topic}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete(topic),
                },
            ]
        );
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
            {/* Delete action */}
            {/* Delete action (Left side) */}
            <Animated.View
                style={[
                    deleteStyle,
                    styles.actionButton,
                    { left: 0, backgroundColor: colors.destructive, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
                ]}
            >
                <Pressable onPress={handleDelete} style={styles.actionPressable}>
                    <Trash2 size={18} color="#fff" />
                </Pressable>
            </Animated.View>

            {/* Continue action (Right side) */}
            <Animated.View
                style={[
                    continueStyle,
                    styles.actionButton,
                    { right: 0, backgroundColor: colors.primary, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
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
