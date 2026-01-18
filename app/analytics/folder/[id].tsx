import { Text } from '@/components/ui/Text';
import { StatsCard } from '@/components/StatsCard';
import { DailyReport } from '@/components/DailyReport';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getFolderById, getFolderStats, getFolderDailyStats, getTopicsByFolder } from '@/lib/database';
import { formatDuration } from '@/lib/utils';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Clock, Hash, Layers } from 'lucide-react-native';
import * as React from 'react';
import {
    RefreshControl,
    ScrollView,
    Pressable,
    View,
    StyleSheet,
} from 'react-native';

export default function FolderAnalyticsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const router = useRouter();

    const [folderName, setFolderName] = React.useState('');
    const [folderColor, setFolderColor] = React.useState(colors.primary);
    const [stats, setStats] = React.useState({ totalTime: 0, sessionCount: 0, topicCount: 0 });
    const [dailyStats, setDailyStats] = React.useState<Map<string, number>>(new Map());
    const [topics, setTopics] = React.useState<{ topic: string; totalTime: number }[]>([]);
    const [refreshing, setRefreshing] = React.useState(false);

    const loadData = React.useCallback(async () => {
        if (!id) return;
        try {
            const folder = await getFolderById(Number(id));
            if (folder) {
                setFolderName(folder.name);
                setFolderColor(folder.color);
            }
            const folderStats = await getFolderStats(Number(id));
            setStats(folderStats);
            const daily = await getFolderDailyStats(Number(id), 30);
            setDailyStats(daily);
            const topicList = await getTopicsByFolder(Number(id));
            setTopics(topicList);
        } catch (error) {
            console.error('Failed to load folder stats:', error);
        }
    }, [id]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.foreground,
                    headerTitle: folderName || 'Folder Analytics',
                    headerLeft: () => (
                        <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
                            <ArrowLeft size={24} color={colors.foreground} />
                        </Pressable>
                    ),
                }}
            />
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={folderColor}
                        />
                    }
                >
                    {/* Stats Cards */}
                    <View style={styles.statsRow}>
                        <StatsCard
                            icon={Clock}
                            label="Total Time"
                            value={formatDuration(stats.totalTime)}
                        />
                        <StatsCard
                            icon={Hash}
                            label="Sessions"
                            value={stats.sessionCount.toString()}
                        />
                    </View>
                    <View style={styles.statsRow}>
                        <StatsCard
                            icon={Layers}
                            label="Topics"
                            value={stats.topicCount.toString()}
                        />
                    </View>

                    {/* Daily Chart */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                            Daily Focus
                        </Text>
                        <DailyReport data={dailyStats} />
                    </View>

                    {/* Topics breakdown */}
                    {topics.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                                Topics
                            </Text>
                            <View style={[styles.topicsList, { backgroundColor: colors.card }]}>
                                {topics.map((t, index) => (
                                    <View
                                        key={t.topic}
                                        style={[
                                            styles.topicItem,
                                            index < topics.length - 1 && {
                                                borderBottomWidth: 1,
                                                borderBottomColor: colors.border,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.topicName, { color: colors.foreground }]} numberOfLines={1}>
                                            {t.topic}
                                        </Text>
                                        <Text style={{ color: folderColor, fontWeight: '600' }}>
                                            {formatDuration(t.totalTime)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    topicsList: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    topicItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
    },
    topicName: {
        flex: 1,
        fontSize: 15,
        marginRight: 12,
    },
});
