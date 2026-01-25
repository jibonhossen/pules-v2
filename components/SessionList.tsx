import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    deleteSession,
    getSessionsByTopic,
    renameAllSessionsWithTopic,
    type Session,
} from '@/lib/database';
import { formatDate, formatDuration, formatTime } from '@/lib/utils';
import { useSessionStore } from '@/store/sessions';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Edit3, FolderOpen, Play, Trash2, X } from 'lucide-react-native';
import * as React from 'react';
import {
    Alert,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
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
    onTap,
    onDelete,
}: {
    session: Session;
    onContinue: (topic: string, folderId: string | null) => void;
    onTap: (session: Session) => void;
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

    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            if (openDirection.value !== null) {
                translateX.value = withTiming(0, { duration: 200 });
                openDirection.value = null;
            } else {
                runOnJS(onTap)(session);
            }
        });

    const gesture = Gesture.Simultaneous(panGesture, tapGesture);

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

interface SessionHistorySheetProps {
    sheetRef: React.RefObject<BottomSheet | null>;
    topic: string | null;
    folderId: string | null;
    onContinue: (topic: string, folderId: string | null) => void;
    onTopicRenamed: () => void;
}

function SessionHistorySheet({
    sheetRef,
    topic,
    folderId,
    onContinue,
    onTopicRenamed,
}: SessionHistorySheetProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const [sessions, setSessions] = React.useState<Session[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editedTopic, setEditedTopic] = React.useState('');

    const snapPoints = React.useMemo(() => ['70%', '90%'], []);

    React.useEffect(() => {
        if (topic) {
            setLoading(true);
            setEditedTopic(topic);
            setIsEditing(false);
            getSessionsByTopic(topic)
                .then(setSessions)
                .finally(() => setLoading(false));
        }
    }, [topic]);

    const totalTime = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

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

    const handleContinue = () => {
        if (topic) {
            sheetRef.current?.close();
            onContinue(isEditing ? editedTopic : (editedTopic || topic), folderId);
        }
    };

    const handleSaveEdit = async () => {
        if (!topic || !editedTopic.trim()) return;

        if (editedTopic.trim() !== topic) {
            try {
                await renameAllSessionsWithTopic(topic, editedTopic.trim());
                onTopicRenamed();
                setIsEditing(false);
                const updatedSessions = await getSessionsByTopic(editedTopic.trim());
                setSessions(updatedSessions);
            } catch (error) {
                Alert.alert('Error', 'Failed to rename sessions');
            }
        } else {
            setIsEditing(false);
        }
    };

    const handleClose = () => {
        sheetRef.current?.close();
    };

    const renderBackdrop = React.useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    return (
        <BottomSheet
            ref={sheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: colors.background }}
            handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
        >
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.modalTitleRow}>
                    {isEditing ? (
                        <TextInput
                            value={editedTopic}
                            onChangeText={setEditedTopic}
                            autoFocus
                            style={[
                                styles.editInput,
                                { backgroundColor: colors.muted, color: colors.foreground },
                            ]}
                            onSubmitEditing={handleSaveEdit}
                        />
                    ) : (
                        <>
                            <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={1}>
                                {editedTopic || topic}
                            </Text>
                            <Pressable
                                onPress={() => setIsEditing(true)}
                                style={[styles.editButton, { backgroundColor: colors.muted }]}
                            >
                                <Edit3 size={18} color={colors.foreground} />
                            </Pressable>
                        </>
                    )}
                </View>
                {isEditing ? (
                    <Pressable
                        onPress={handleSaveEdit}
                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        onPress={handleClose}
                        style={[styles.closeButton, { backgroundColor: colors.muted }]}
                    >
                        <X size={20} color={colors.foreground} />
                    </Pressable>
                )}
            </View>

            {/* Stats */}
            <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                <Text variant="muted">
                    {sessions.length} sessions · {formatDuration(totalTime)} total
                </Text>
            </View>

            {/* Session List */}
            <BottomSheetScrollView style={styles.sessionsList} contentContainerStyle={{ paddingBottom: 100 }}>
                {groupedSessions.map((group, groupIndex) => (
                    <View key={groupIndex} style={styles.sessionGroup}>
                        <Text variant="muted" style={styles.groupDate}>
                            {group.date}
                        </Text>
                        {group.sessions.map((session) => (
                            <View
                                key={session.id}
                                style={[styles.sessionItem, { backgroundColor: colors.card, borderLeftColor: session.topic_color || colors.primary, borderLeftWidth: session.topic_color ? 4 : 0 }]}
                            >
                                <Text style={{ color: colors.foreground, fontSize: 14 }}>
                                    {formatTime(session.start_time)}
                                    {session.end_time && ` - ${formatTime(session.end_time)}`}
                                </Text>
                                <Text style={[styles.sessionDuration, { color: session.topic_color || colors.primary }]}>
                                    {formatDuration(session.duration_seconds)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}
            </BottomSheetScrollView>

            {/* Continue Button */}
            <View style={[styles.sheetFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <Pressable
                    onPress={handleContinue}
                    style={[styles.continueSessionButton, { backgroundColor: colors.primary }]}
                >
                    <Text style={styles.continueSessionText}>
                        Continue This Session
                    </Text>
                </Pressable>
            </View>
        </BottomSheet>
    );
}

interface SessionListProps {
    onStartSession: (topic: string, folderId: string | null) => void;
}

export function SessionList({ onStartSession }: SessionListProps) {
    const { todaySessions, loadSessions } = useSessionStore();
    const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);
    const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
    const sheetRef = React.useRef<BottomSheet>(null);
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    React.useEffect(() => {
        loadSessions();
    }, []);

    const handleTap = (session: Session) => {
        setSelectedTopic(session.topic);
        setSelectedFolderId(session.folder_id);
        sheetRef.current?.snapToIndex(0);
    };

    const handleContinue = (topic: string, folderId: string | null) => {
        onStartSession(topic, folderId);
    };

    const handleTopicRenamed = () => {
        loadSessions();
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

    if (todaySessions.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
                    No sessions today
                </Text>
                <Text variant="muted" style={styles.emptySubtitle}>
                    Start your first focus session to see it here
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.listHeader}>
                    <Text style={[styles.listTitle, { color: colors.foreground }]}>
                        Today's Sessions
                    </Text>
                </View>
                {todaySessions.map((session) => (
                    <SwipeableSessionCard
                        key={session.id}
                        session={session}
                        onContinue={handleContinue}
                        onTap={handleTap}
                        onDelete={handleDelete}
                    />
                ))}
            </ScrollView>

            <SessionHistorySheet
                sheetRef={sheetRef}
                topic={selectedTopic}
                folderId={selectedFolderId}
                onContinue={handleContinue}
                onTopicRenamed={handleTopicRenamed}
            />
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        maxHeight: '80%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitleRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
    },
    editInput: {
        flex: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 18,
        fontWeight: '700',
    },
    editButton: {
        borderRadius: 20,
        padding: 8,
    },
    saveButton: {
        marginLeft: 8,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    closeButton: {
        marginLeft: 8,
        borderRadius: 20,
        padding: 8,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    sessionsList: {
        paddingHorizontal: 20,
    },
    sessionGroup: {
        marginTop: 16,
    },
    groupDate: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    sessionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    sessionDuration: {
        fontWeight: '600',
    },
    modalFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
    },
    sheetFooter: {
        padding: 20,
        paddingBottom: 32,
        borderTopWidth: 1,
    },
    continueSessionButton: {
        alignItems: 'center',
        borderRadius: 16,
        paddingVertical: 16,
    },
    continueSessionText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
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
