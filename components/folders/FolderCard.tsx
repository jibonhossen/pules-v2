import { useSwipeContext } from '@/components/SwipeContext';
import { Text } from '@/components/ui/Text';
import { TopicItem } from './TopicItem';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDuration } from '@/lib/utils';
import type { Folder } from '@/lib/database';
import { ChevronDown, ChevronRight, BarChart3, Trash2, Edit3, Plus } from 'lucide-react-native';
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

const ACTION_WIDTH = 140;

interface TopicData {
    topic: string;
    totalTime: number;
    sessionCount: number;
    lastSession: string;
}

interface FolderCardProps {
    folder: Folder;
    topics: TopicData[];
    totalTime: number;
    onEdit: (folder: Folder) => void;
    onDelete: (folder: Folder) => void;
    onAnalytics: (folder: Folder) => void;
    onAddTopic: (folderId: number, folderName: string) => void;
    onStartTopic: (topic: string, folderId: number) => void;
    onTopicAnalytics: (topic: string) => void;
    onDeleteTopic: (topic: string) => void;
    onRenameTopic: (topic: string) => void;
}

export function FolderCard({
    folder,
    topics,
    totalTime,
    onEdit,
    onDelete,
    onAnalytics,
    onAddTopic,
    onStartTopic,
    onTopicAnalytics,
    onDeleteTopic,
    onRenameTopic,
}: FolderCardProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const [expanded, setExpanded] = React.useState(false);
    const translateX = useSharedValue(0);
    const isOpen = useSharedValue(false);

    const { registerOpenItem, closeCurrent } = useSwipeContext() || {};

    const handleClose = () => {
        translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
        isOpen.value = false;
    };

    const handleRegisterOpen = () => {
        if (registerOpenItem) {
            registerOpenItem(folder.id.toString(), handleClose);
        }
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            if (isOpen.value) {
                // Allow dragging back to 0
                const target = -ACTION_WIDTH + event.translationX;
                translateX.value = Math.max(-ACTION_WIDTH, Math.min(0, target));
            } else {
                // Only allow swipe left (negative)
                translateX.value = Math.max(-ACTION_WIDTH, Math.min(0, event.translationX));
            }
        })
        .onEnd((event) => {
            if (translateX.value < -ACTION_WIDTH / 2 || event.velocityX < -500) {
                translateX.value = withTiming(-ACTION_WIDTH, { duration: 200 });
                isOpen.value = true;
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                runOnJS(handleRegisterOpen)();
            } else {
                translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
                isOpen.value = false;
            }
        });

    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            if (isOpen.value) {
                runOnJS(handleClose)();
            } else {
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                runOnJS(setExpanded)(!expanded);
            }
        });

    const gesture = Gesture.Simultaneous(panGesture, tapGesture);

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const actionsStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [-ACTION_WIDTH, 0], [1, 0]),
        // Slide the actions in from the right as we swipe left
        transform: [{
            translateX: interpolate(
                translateX.value,
                [-ACTION_WIDTH, 0],
                [0, ACTION_WIDTH]
            )
        }]
    }));

    const handleDelete = () => {
        handleClose();
        Alert.alert(
            'Delete Folder',
            `Delete "${folder.name}"? Topics inside will be unassigned.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete(folder),
                },
            ]
        );
    };

    const handleEdit = () => {
        handleClose();
        onEdit(folder);
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                {/* Actions */}
                <Animated.View style={[actionsStyle, styles.actionsContainer]}>
                    <Pressable
                        onPress={handleEdit}
                        style={[styles.actionButton, { backgroundColor: colors.secondary }]}
                    >
                        <Edit3 size={18} color={colors.foreground} />
                    </Pressable>
                    <Pressable
                        onPress={handleDelete}
                        style={[styles.actionButton, { backgroundColor: colors.destructive }]}
                    >
                        <Trash2 size={18} color="#fff" />
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
                        <View style={[styles.colorDot, { backgroundColor: folder.color }]} />
                        <View style={styles.content}>
                            <Text style={[styles.folderName, { color: colors.foreground }]}>
                                {folder.name}
                            </Text>
                            <Text variant="muted" style={styles.stats}>
                                {topics.length} topics · {formatDuration(totalTime)}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => onAnalytics(folder)}
                            style={[styles.analyticsButton, { backgroundColor: `${folder.color}20` }]}
                        >
                            <BarChart3 size={16} color={folder.color} />
                        </Pressable>
                        {expanded ? (
                            <ChevronDown size={20} color={colors.mutedForeground} />
                        ) : (
                            <ChevronRight size={20} color={colors.mutedForeground} />
                        )}
                    </Animated.View>
                </GestureDetector>
            </View>

            {/* Expanded topics */}
            {expanded && (
                <View style={styles.topicsContainer}>
                    {/* Add Topic Button */}
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onAddTopic(folder.id, folder.name);
                        }}
                        style={[styles.addTopicButton, { backgroundColor: `${folder.color}15`, borderColor: folder.color }]}
                    >
                        <Plus size={16} color={folder.color} />
                        <Text style={[styles.addTopicText, { color: folder.color }]}>Add Topic</Text>
                    </Pressable>

                    {topics.length === 0 ? (
                        <Text variant="muted" style={styles.emptyText}>
                            No topics yet
                        </Text>
                    ) : (
                        topics.map((topic) => (
                            <TopicItem
                                key={topic.topic}
                                topic={topic.topic}
                                totalTime={topic.totalTime}
                                sessionCount={topic.sessionCount}
                                lastSession={topic.lastSession}
                                onStart={() => onStartTopic(topic.topic, folder.id)}
                                onAnalytics={onTopicAnalytics}
                                onDelete={onDeleteTopic}
                                onRename={onRenameTopic}
                            />
                        ))
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 12,
    },
    container: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionsContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: ACTION_WIDTH,
        flexDirection: 'row',
    },
    actionButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    content: {
        flex: 1,
    },
    folderName: {
        fontSize: 16,
        fontWeight: '600',
    },
    stats: {
        fontSize: 12,
        marginTop: 2,
    },
    analyticsButton: {
        padding: 8,
        borderRadius: 8,
    },
    topicsContainer: {
        marginTop: 8,
    },
    addTopicButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginLeft: 16,
        marginBottom: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    addTopicText: {
        fontSize: 14,
        fontWeight: '500',
    },
    emptyText: {
        marginLeft: 16,
        marginTop: 4,
        marginBottom: 8,
        fontSize: 13,
    },
});
