import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLiveSessions } from '@/hooks/useLiveDatabase';
import {
    deleteSession,
    type Session
} from '@/lib/database';
import { formatDate, formatDuration, formatTime } from '@/lib/utils';
import { useSessionStore } from '@/store/sessions';
import * as Haptics from 'expo-haptics';
import { FolderOpen, Play, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import {
    Alert,
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTINUE_WIDTH = 70;
const DELETE_WIDTH = 70;

function SwipeableSessionCard({
    session,
    onContinue,
    onDelete,
}: {
    session: Session;
    onContinue: (topic: string, folderId: string | null) => void;
    onDelete: (session: Session) => void;
}) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const translateX = useSharedValue(0);
    const openDirection = useSharedValue<'left' | 'right' | null>(null);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            if (openDirection.value === 'left') {
                translateX.value = Math.max(-CONTINUE_WIDTH, Math.min(0, -CONTINUE_WIDTH + event.translationX));
            } else if (openDirection.value === 'right') {
                translateX.value = Math.max(0, Math.min(DELETE_WIDTH, DELETE_WIDTH + event.translationX));
            } else {
                translateX.value = Math.max(-CONTINUE_WIDTH, Math.min(DELETE_WIDTH, event.translationX));
            }
        })
        .onEnd((event) => {
            if (translateX.value < -CONTINUE_WIDTH / 2 || event.velocityX < -500) {
                translateX.value = withTiming(-CONTINUE_WIDTH, { duration: 200 });
                openDirection.value = 'left';
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            } else if (translateX.value > DELETE_WIDTH / 2 || event.velocityX > 500) {
                translateX.value = withTiming(DELETE_WIDTH, { duration: 200 });
                openDirection.value = 'right';
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            } else {
                translateX.value = withTiming(0, { duration: 200 });
                openDirection.value = null;
            }
        });

    const gesture = panGesture;

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const continueStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [-CONTINUE_WIDTH, 0], [1, 0]),
    }));

    const deleteStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, DELETE_WIDTH], [0, 1]),
    }));

    const handleContinue = () => {
        translateX.value = withTiming(0, { duration: 200 });
        openDirection.value = null;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onContinue(session.topic, session.folder_id);
    };

    const handleDelete = () => {
        translateX.value = withTiming(0, { duration: 200 });
        openDirection.value = null;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDelete(session);
    };

    return (
        <View style={styles.swipeContainer}>
            {/* Continue Button (right side - revealed on swipe left) */}
            <Animated.View
                style={[
                    continueStyle,
                    styles.actionButton,
                    styles.continueButton,
                    { backgroundColor: colors.primary },
                ]}
            >
                <Pressable onPress={handleContinue} style={styles.actionPressable}>
                    <Play size={20} color="#fff" fill="#fff" />
                    <Text style={styles.actionText}>Continue</Text>
                </Pressable>
            </Animated.View>

            {/* Delete Button (left side - revealed on swipe right) */}
            <Animated.View
                style={[
                    deleteStyle,
                    styles.actionButton,
                    styles.deleteButton,
                    { backgroundColor: colors.destructive },
                ]}
            >
                <Pressable onPress={handleDelete} style={styles.actionPressable}>
                    <Trash2 size={20} color="#fff" />
                    <Text style={styles.actionText}>Delete</Text>
                </Pressable>
            </Animated.View>

            {/* Card */}
            <GestureDetector gesture={gesture}>
                <Animated.View
                    style={[
                        cardStyle,
                        styles.card,
                        { backgroundColor: colors.card },
                    ]}
                >
                    <View style={styles.cardContent}>
                        <View style={styles.cardLeft}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {session.topic_color && (
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: session.topic_color }} />
                                )}
                                <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                                    {session.topic || 'Untitled Session'}
                                </Text>
                            </View>
                            <Text variant="muted" style={styles.cardTime}>
                                {formatTime(session.start_time)}
                                {session.end_time && ` - ${formatTime(session.end_time)}`}
                            </Text>
                            {session.folder_name && (
                                <View style={[styles.folderBadge, { backgroundColor: `${session.folder_color || colors.primary}20`, marginTop: 8 }]}>
                                    <FolderOpen size={12} color={session.folder_color || colors.primary} />
                                    <Text style={[styles.folderBadgeText, { color: session.folder_color || colors.primary }]}>
                                        {session.folder_name}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.cardRight}>
                            <Text style={[styles.cardDuration, { color: colors.primary }]}>
                                {formatDuration(session.duration_seconds)}
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}



interface SessionListProps {
    onStartSession: (topic: string, folderId: string | null) => void;
}

export function SessionList({ onStartSession }: SessionListProps) {
    const { loadSessions } = useSessionStore();
    const sessions = useLiveSessions(7); // Load last 7 days
    const { colorScheme } = useColorScheme();

    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const [refreshing, setRefreshing] = React.useState(false);

    // Group sessions by date
    const groupedSessions = React.useMemo(() => {
        const groups: { date: string; sessions: Session[] }[] = [];
        let currentDate = '';

        sessions.forEach((session) => {
            const dateStr = formatDate(session.start_time);
            if (dateStr !== currentDate) {
                currentDate = dateStr;
                groups.push({ date: dateStr, sessions: [session] });
            } else {
                groups[groups.length - 1].sessions.push(session);
            }
        });

        return groups;
    }, [sessions]);



    const handleContinue = (topic: string, folderId: string | null) => {
        onStartSession(topic, folderId);
    };



    const handleDelete = (session: Session) => {
        Alert.alert(
            'Delete Session',
            `Delete "${session.topic || 'Untitled'}" (${formatDuration(session.duration_seconds)})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteSession(session.id);
                        loadSessions();
                    },
                },
            ]
        );
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            // Trigger manual sync check - verify consistency
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            setRefreshing(false);
        }
    }, []);

    if (sessions.length === 0) {
        return (
            <ScrollView
                contentContainerStyle={styles.emptyContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
                    No recent sessions
                </Text>
                <Text variant="muted" style={styles.emptySubtitle}>
                    Start a focus session to see it here
                </Text>
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                <View style={styles.listHeader}>
                    <Text style={[styles.listTitle, { color: colors.foreground }]}>
                        Recent Sessions
                    </Text>
                    <Text variant="muted" style={{ fontSize: 12 }}>
                        Last 7 Days
                    </Text>
                </View>

                {groupedSessions.map((group, groupIndex) => (
                    <View key={groupIndex} style={styles.sessionGroup}>
                        <Text variant="muted" style={[styles.groupDate, { marginLeft: 4 }]}>
                            {group.date}
                        </Text>
                        {group.sessions.map((session) => (
                            <SwipeableSessionCard
                                key={session.id}
                                session={session}
                                onContinue={handleContinue}
                                onDelete={handleDelete}
                            />
                        ))}
                    </View>
                ))}

                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    swipeContainer: {
        marginBottom: 12,
        overflow: 'hidden',
        borderRadius: 12,
    },
    actionButton: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButton: {
        right: 0,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
    deleteButton: {
        left: 0,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    actionPressable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        marginTop: 4,
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    card: {
        borderRadius: 12,
        padding: 16,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardLeft: {
        flex: 1,
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    cardTitle: {
        fontWeight: '500',
        fontSize: 16,
    },
    cardTime: {
        marginTop: 4,
        fontSize: 12,
    },
    cardDuration: {
        fontWeight: '600',
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    sessionGroup: {
        marginTop: 16,
    },
    groupDate: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    folderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    folderBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
