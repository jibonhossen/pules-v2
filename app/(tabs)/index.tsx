import { CircularTimer } from '@/components/CircularTimer';
import { SessionList } from '@/components/SessionList';
import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppState } from '@/hooks/useAppState';
import { useSessionStore } from '@/store/sessions';
import * as Haptics from 'expo-haptics';
import { FolderOpen, MoonStar, Pause, Play, Square, Sun } from 'lucide-react-native';
import * as React from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ViewMode = 'list' | 'focus';

function SegmentedControl({
    value,
    onChange,
}: {
    value: ViewMode;
    onChange: (value: ViewMode) => void;
}) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const handleChange = (mode: ViewMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(mode);
    };

    return (
        <View style={[styles.segmentContainer, { backgroundColor: colors.muted }]}>
            {(['list', 'focus'] as const).map((mode) => (
                <Pressable
                    key={mode}
                    onPress={() => handleChange(mode)}
                    style={[
                        styles.segmentButton,
                        value === mode && [
                            styles.segmentButtonActive,
                            {
                                backgroundColor: colors.card,
                                shadowColor: colors.primary,
                            },
                        ],
                    ]}
                >
                    <Text
                        style={[
                            styles.segmentText,
                            { color: value === mode ? colors.foreground : colors.mutedForeground },
                            value === mode && styles.segmentTextActive,
                        ]}
                    >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

function ThemeToggle() {
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const handleToggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleColorScheme();
    };

    return (
        <Pressable
            onPress={handleToggle}
            style={[styles.themeToggle, { backgroundColor: colors.muted }]}
        >
            {colorScheme === 'dark' ? (
                <MoonStar size={20} color={colors.foreground} />
            ) : (
                <Sun size={20} color={colors.foreground} />
            )}
        </Pressable>
    );
}

function TimerControlButton({
    onPress,
    disabled,
    icon,
    color,
    style,
}: {
    onPress: () => void;
    disabled?: boolean;
    icon: React.ReactNode;
    color: string;
    style?: any;
}) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 15 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15 });
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    };

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[
                animatedStyle,
                styles.playButton,
                {
                    backgroundColor: color,
                    shadowColor: color,
                    opacity: disabled ? 0.5 : 1,
                },
                style
            ]}
        >
            {icon}
        </AnimatedPressable>
    );
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TimerScreen() {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const insets = useSafeAreaInsets();

    const [viewMode, setViewMode] = React.useState<ViewMode>('focus');
    const [topic, setTopic] = React.useState('');

    const {
        isRunning,
        isPaused,
        elapsedSeconds,
        currentTopic,
        currentFolderName,
        startTimer,
        stopTimer,
        pauseTimer,
        resumeTimer,
        tick,
        loadSessions,
        loadStats,
        onAppBackground,
        onAppForeground,
    } = useSessionStore();

    // Handle app state changes
    useAppState(onAppBackground, onAppForeground);

    // Timer tick effect
    React.useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isRunning && !isPaused) {
            interval = setInterval(tick, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, isPaused, tick]);

    // Load data on mount
    React.useEffect(() => {
        loadSessions();
        loadStats();
    }, []);

    // Sync local topic
    React.useEffect(() => {
        if (currentTopic && isRunning) {
            setTopic(currentTopic);
        }
    }, [currentTopic, isRunning]);

    const handleStart = async () => {
        if (topic.trim()) {
            await startTimer(topic.trim());
            Keyboard.dismiss();
        }
    };

    const handleStop = async () => {
        await stopTimer();
        setTopic('');
    };

    const handleTogglePause = () => {
        if (isPaused) {
            resumeTimer();
        } else {
            pauseTimer();
        }
    };

    const handleContinueSession = async (sessionTopic: string, folderId: number | null) => {
        setTopic(sessionTopic);
        await startTimer(sessionTopic, folderId ?? undefined);
        setViewMode('focus');
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[
                styles.container,
                {
                    backgroundColor: colors.background,
                    paddingTop: insets.top,
                }
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.foreground }]}>Pulse</Text>
                <ThemeToggle />
            </View>

            {/* Segmented Control */}
            <View style={styles.segmentWrapper}>
                <SegmentedControl value={viewMode} onChange={setViewMode} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                {viewMode === 'focus' ? (
                    <View style={styles.timerContainer}>
                        <CircularTimer
                            elapsedSeconds={elapsedSeconds}
                            isRunning={isRunning}
                        />
                    </View>
                ) : (
                    <SessionList onStartSession={handleContinueSession} />
                )}
            </View>

            {/* Input Section */}
            <View style={[styles.inputSection, { borderTopColor: colors.border }]}>
                {!isRunning ? (
                    <View style={styles.inputRow}>
                        <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
                            <TextInput
                                placeholder="I'm working on..."
                                placeholderTextColor={colors.mutedForeground}
                                value={topic}
                                onChangeText={setTopic}
                                style={[styles.input, { color: colors.foreground }]}
                            />
                        </View>
                        <TimerControlButton
                            onPress={handleStart}
                            disabled={!topic.trim()}
                            color={colors.primary}
                            icon={<Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />}
                        />
                    </View>
                ) : (
                    <View style={styles.controlsColumn}>
                        {/* Controls */}
                        <View style={styles.controlsRow}>
                            <TimerControlButton
                                onPress={handleTogglePause}
                                color={isPaused ? colors.primary : '#F59E0B'} // Resume = Primary, Pause = Orange
                                icon={
                                    isPaused ? (
                                        <Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
                                    ) : (
                                        <Pause size={24} color="#fff" fill="#fff" />
                                    )
                                }
                            />
                            <TimerControlButton
                                onPress={handleStop}
                                color={colors.destructive}
                                icon={<Square size={22} color="#fff" fill="#fff" />}
                            />
                        </View>

                        {/* Info */}
                        <View style={styles.focusingContainer}>
                            <Text variant="muted" style={styles.focusingText}>
                                Currently {isPaused ? 'paused' : 'focusing'} on: <Text style={{ color: colors.primary }}>{topic}</Text>
                            </Text>
                            {currentFolderName && (
                                <View style={[styles.folderBadge, { backgroundColor: `${colors.primary}20` }]}>
                                    <FolderOpen size={12} color={colors.primary} />
                                    <Text style={[styles.folderBadgeText, { color: colors.primary }]}>
                                        {currentFolderName}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
    },
    themeToggle: {
        borderRadius: 20,
        padding: 10,
    },
    segmentWrapper: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    segmentContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
    },
    segmentButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    segmentButtonActive: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '500',
    },
    segmentTextActive: {
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    timerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '20%',
    },
    inputSection: {
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    focusingText: {
        fontSize: 14,
        textAlign: 'center',
    },
    focusingContainer: {
        marginTop: 12,
        alignItems: 'center',
        gap: 6,
    },
    folderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    folderBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    controlsColumn: {
        alignItems: 'center',
        width: '100%',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 8,
    },
});
