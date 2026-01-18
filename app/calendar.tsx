import { FolderCard, CreateFolderModal, AddTopicModal, SelectFolderModal, TopicItem } from '@/components/folders';
import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    getTopicsByFolder,
    getUnfolderedTopics,
    getFolderStats,
    moveTopicToFolder,
    createTopicInFolder, // Added this line
    deleteTopic,
    type Folder,
} from '@/lib/database';
import { useSessionStore } from '@/store/sessions';
import { useRouter } from 'expo-router';
import { Plus, FolderOpen } from 'lucide-react-native';
import * as React from 'react';
import * as Haptics from 'expo-haptics';
import {
    RefreshControl,
    ScrollView,
    Pressable,
    View,
    StyleSheet,
    Alert,
} from 'react-native';

interface TopicData {
    topic: string;
    totalTime: number;
    sessionCount: number;
    lastSession: string;
}

interface FolderWithData extends Folder {
    topics: TopicData[];
    totalTime: number;
}

export default function FoldersScreen() {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const router = useRouter();
    const { startTimer } = useSessionStore();

    const [folders, setFolders] = React.useState<FolderWithData[]>([]);
    const [unfolderedTopics, setUnfolderedTopics] = React.useState<TopicData[]>([]);
    const [refreshing, setRefreshing] = React.useState(false);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [editingFolder, setEditingFolder] = React.useState<Folder | null>(null);
    const [addTopicModalVisible, setAddTopicModalVisible] = React.useState(false);
    const [selectedFolderForTopic, setSelectedFolderForTopic] = React.useState<{ id: number; name: string; color: string } | null>(null);
    const [moveTopicModalVisible, setMoveTopicModalVisible] = React.useState(false);
    const [topicToMove, setTopicToMove] = React.useState('');

    const loadData = React.useCallback(async () => {
        try {
            const allFolders = await getFolders();
            const foldersWithData: FolderWithData[] = await Promise.all(
                allFolders.map(async (folder) => {
                    const topics = await getTopicsByFolder(folder.id);
                    const stats = await getFolderStats(folder.id);
                    return {
                        ...folder,
                        topics,
                        totalTime: stats.totalTime,
                    };
                })
            );
            setFolders(foldersWithData);

            const unfoldered = await getUnfolderedTopics();
            setUnfolderedTopics(unfoldered);
        } catch (error) {
            console.error('Failed to load folders:', error);
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
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

    const handleStartTopic = async (topic: string, folderId?: number) => {
        await startTimer(topic, folderId);
        router.push('/');
    };

    const handleTopicAnalytics = (topic: string) => {
        router.push(`/analytics/topic/${encodeURIComponent(topic)}`);
    };

    const handleAddTopic = (folderId: number, folderName: string) => {
        const folder = folders.find(f => f.id === folderId);
        setSelectedFolderForTopic({
            id: folderId,
            name: folderName,
            color: folder?.color || colors.primary
        });
        setAddTopicModalVisible(true);
    };

    const handleSaveNewTopic = async (topicName: string) => {
        if (selectedFolderForTopic && topicName.trim()) {
            await createTopicInFolder(topicName.trim(), selectedFolderForTopic.id);
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

    const handleMoveTopic = async (folderId: number) => {
        if (topicToMove) {
            await moveTopicToFolder(topicToMove, folderId);
            await loadData();
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Folders */}
                {folders.length === 0 && unfolderedTopics.length === 0 ? (
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
                                            onStart={handleStartTopic}
                                            onAnalytics={handleTopicAnalytics}
                                            onDelete={handleDeleteTopic}
                                            onMove={handleUnorganizedTopicPress}
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
        </View>
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
