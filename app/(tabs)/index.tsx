import { AddTopicModal, CreateFolderModal, FolderCard, RenameTopicModal, SelectFolderModal, TopicItem } from '@/components/folders';
import { SwipeProvider } from '@/components/SwipeContext';
import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    createFolder,
    createTopicInFolder,
    deleteFolder,
    deleteTopic,
    getAllFolderTopics,
    getFolders,
    getUnfolderedTopics,
    moveTopicToFolder,
    renameAllSessionsWithTopic,
    updateFolder,
    upsertTopicConfig,
    type Folder
} from '@/lib/database';
import { useSessionStore } from '@/store/sessions';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { FolderOpen, Plus } from 'lucide-react-native';
import * as React from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TopicData {
    topic: string;
    totalTime: number;
    sessionCount: number;
    lastSession: string;
    color?: string | null;
}

interface FolderWithData extends Folder {
    topics: TopicData[];
    totalTime: number;
}

export default function FoldersScreen() {
    const userId = useSessionStore((state) => state.userId);
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const router = useRouter();
    const { startTimer, isRunning, currentTopic } = useSessionStore();

    const [folders, setFolders] = React.useState<FolderWithData[]>([]);
    const [unfolderedTopics, setUnfolderedTopics] = React.useState<TopicData[]>([]);
    const [refreshing, setRefreshing] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true); // Initial load state
    const [modalVisible, setModalVisible] = React.useState(false);
    const [editingFolder, setEditingFolder] = React.useState<Folder | null>(null);
    const [addTopicModalVisible, setAddTopicModalVisible] = React.useState(false);
    const [selectedFolderForTopic, setSelectedFolderForTopic] = React.useState<{ id: string; name: string; color: string } | null>(null);
    const [moveTopicModalVisible, setMoveTopicModalVisible] = React.useState(false);
    const [topicToMove, setTopicToMove] = React.useState('');
    const [renameTopicModalVisible, setRenameTopicModalVisible] = React.useState(false);
    const [topicToRename, setTopicToRename] = React.useState('');

    const loadData = React.useCallback(async (showLoading = false) => {
        if (!userId) return;
        if (showLoading) setIsLoading(true);

        try {
            console.time('loadData');
            // Fetch all data in parallel batches
            const [allFolders, allTopics, unfoldered] = await Promise.all([
                getFolders(userId),
                getAllFolderTopics(userId),
                getUnfolderedTopics(userId)
            ]);

            console.log('[UI] Fetched:', allFolders.length, 'folders,', allTopics.length, 'topics');

            if (!allFolders) {
                setFolders([]);
                return;
            }

            // Map topics to folders in memory (much faster than N+1 queries)
            const topicMap = new Map<string, TopicData[]>();
            allTopics.forEach(t => {
                const folderId = t.folder_id;
                if (!topicMap.has(folderId)) topicMap.set(folderId, []);
                topicMap.get(folderId)?.push({
                    topic: t.topic,
                    totalTime: t.totalTime,
                    sessionCount: t.sessionCount,
                    lastSession: t.lastSession,
                    color: t.color
                });
            });

            const foldersWithData: FolderWithData[] = allFolders.map(folder => {
                const topics = topicMap.get(folder.id) || [];
                const totalTime = topics.reduce((sum, t) => sum + t.totalTime, 0);
                return {
                    ...folder,
                    topics,
                    totalTime,
                };
            });

            setFolders(foldersWithData);
            setUnfolderedTopics(unfoldered);
            console.timeEnd('loadData');
        } catch (error) {
            console.error('Failed to load folders:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        if (userId) {
            loadData(true); // Show loading only on first mount/user change
        }
    }, [loadData, userId]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            // PowerSync handles sync automatically
            await loadData(false);
        } catch (e) {
            console.error('Refresh failed', e);
            Alert.alert('Error', 'Failed to refresh data');
        } finally {
            setRefreshing(false);
        }
    }, [loadData]);

    const handleCreateFolder = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setEditingFolder(null);
        setModalVisible(true);
    };

    const handleEditFolder = (folder: Folder) => {
        setEditingFolder(folder);
        setModalVisible(true);
    };

    const handleSaveFolder = async (name: string, color: string) => {
        try {
            if (editingFolder) {
                await updateFolder(editingFolder.id, name, color, 'folder');
            } else {
                await createFolder(name, color);
            }
            await loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to save folder');
        }
    };

    const handleDeleteFolder = async (folder: Folder) => {
        try {
            await deleteFolder(folder.id);
            await loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete folder');
        }
    };

    const handleFolderAnalytics = (folder: Folder) => {
        router.push(`/analytics/folder/${folder.id}`);
    };

    const handleStartTopic = async (topic: string, folderId?: string) => {
        if (isRunning) {
            Alert.alert(
                'Start New Session?',
                `"${currentTopic}" is currently running. Save it and start "${topic}"?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Start',
                        style: 'default',
                        onPress: async () => {
                            await startTimer(topic, folderId);
                            router.push(`/timer?mode=focus&t=${Date.now()}`);
                        },
                    },
                ]
            );
            return;
        }
        await startTimer(topic, folderId);
        router.push(`/timer?mode=focus&t=${Date.now()}`);
    };

    const handleTopicAnalytics = (topic: string) => {
        router.push(`/analytics/topic/${encodeURIComponent(topic)}`);
    };

    const handleAddTopic = (folderId: string, folderName: string) => {
        const folder = folders.find(f => f.id === folderId);
        setSelectedFolderForTopic({
            id: folderId,
            name: folderName,
            color: folder?.color || colors.primary
        });
        setAddTopicModalVisible(true);
    };

    const handleSaveNewTopic = async (topicName: string, allowBackground: boolean, color: string) => {
        if (selectedFolderForTopic && topicName.trim()) {
            // createTopicInFolder now handles color and folder assignment via upsertTopicConfig
            await createTopicInFolder(topicName.trim(), selectedFolderForTopic.id, color);
            // Update allow_background setting if enabled
            if (allowBackground) {
                await upsertTopicConfig(topicName.trim(), true, color, selectedFolderForTopic.id);
            }
            setAddTopicModalVisible(false);
            loadData(); // Reload to show the new topic
        }
    };

    const handleDeleteTopic = async (topic: string) => {
        try {
            await deleteTopic(topic);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete topic');
        }
    };

    const handleUnorganizedTopicPress = (topic: string) => {
        setTopicToMove(topic);
        setMoveTopicModalVisible(true);
    };

    const handleMoveTopic = async (folderId: string) => {
        if (topicToMove) {
            await moveTopicToFolder(topicToMove, folderId);
            await loadData();
        }
    };

    const handleOpenRenameTopic = (topic: string) => {
        setTopicToRename(topic);
        setRenameTopicModalVisible(true);
    };

    const handleRenameTopic = async (oldTopic: string, newTopic: string) => {
        try {
            await renameAllSessionsWithTopic(oldTopic, newTopic);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to rename topic');
        }
    };

    const insets = useSafeAreaInsets();

    return (

        <SwipeProvider>
            <View style={[
                styles.container,
                {
                    backgroundColor: colors.background,
                    paddingTop: insets.top,
                }
            ]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.foreground }]}>Folders</Text>
                    <Pressable
                        onPress={handleCreateFolder}
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                    >
                        <Plus size={22} color="#fff" />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"

                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {isLoading ? (
                        <View style={{ paddingTop: 100, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : folders.length === 0 && unfolderedTopics.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}20` }]}>
                                <FolderOpen size={48} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                                No folders yet
                            </Text>
                            <Text variant="muted" style={styles.emptySubtitle}>
                                Create a folder to organize your focus topics
                            </Text>
                            <Pressable
                                onPress={handleCreateFolder}
                                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                            >
                                <Plus size={18} color="#fff" />
                                <Text style={styles.emptyButtonText}>Create Folder</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            {folders.map((folder) => (
                                <FolderCard
                                    key={folder.id}
                                    folder={folder}
                                    topics={folder.topics}
                                    totalTime={folder.totalTime}
                                    onEdit={handleEditFolder}
                                    onDelete={handleDeleteFolder}
                                    onAnalytics={handleFolderAnalytics}
                                    onAddTopic={handleAddTopic}
                                    onStartTopic={(topic, folderId) => handleStartTopic(topic, folderId)}
                                    onTopicAnalytics={handleTopicAnalytics}
                                    onDeleteTopic={handleDeleteTopic}
                                    onRenameTopic={handleOpenRenameTopic}
                                />
                            ))}

                            {/* Unfoldered topics */}
                            {unfolderedTopics.length > 0 && (
                                <View style={styles.unfolderedSection}>
                                    <Text variant="muted" style={styles.sectionTitle}>
                                        Unorganized Topics
                                    </Text>
                                    <View style={{ gap: 8 }}>
                                        {unfolderedTopics.map((topic) => (
                                            <TopicItem
                                                key={topic.topic}
                                                topic={topic.topic}
                                                totalTime={topic.totalTime}
                                                sessionCount={topic.sessionCount}
                                                lastSession={topic.lastSession}
                                                color={topic.color}
                                                onStart={handleStartTopic}
                                                onAnalytics={handleTopicAnalytics}
                                                onDelete={handleDeleteTopic}
                                                onMove={handleUnorganizedTopicPress}
                                                onRename={handleOpenRenameTopic}
                                            />
                                        ))}
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>

                <CreateFolderModal
                    visible={modalVisible}
                    folder={editingFolder}
                    onClose={() => setModalVisible(false)}
                    onSave={handleSaveFolder}
                />

                <AddTopicModal
                    visible={addTopicModalVisible}
                    folderName={selectedFolderForTopic?.name || ''}
                    folderColor={selectedFolderForTopic?.color || colors.primary}
                    onClose={() => setAddTopicModalVisible(false)}
                    onSave={handleSaveNewTopic}
                />

                <SelectFolderModal
                    visible={moveTopicModalVisible}
                    folders={folders}
                    topic={topicToMove}
                    onClose={() => setMoveTopicModalVisible(false)}
                    onSelect={handleMoveTopic}
                />

                <RenameTopicModal
                    visible={renameTopicModalVisible}
                    currentTopic={topicToRename}
                    onClose={() => setRenameTopicModalVisible(false)}
                    onSave={handleRenameTopic}
                />
            </View>
        </SwipeProvider>
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
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyIcon: {
        padding: 24,
        borderRadius: 32,
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    emptyButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    unfolderedSection: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    unfolderedCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    unfolderedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    unfolderedTopic: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    unfolderedStats: {
        fontSize: 12,
    },
});
