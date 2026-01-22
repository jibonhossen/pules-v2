import { Text } from '@/components/ui/Text';
import { StatsCard } from '@/components/StatsCard';
import { DailyReport } from '@/components/DailyReport';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTopicStats, getTopicDailyStats, getSessionsByTopic, deleteTopic } from '@/lib/database';
import { formatDuration } from '@/lib/utils';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Clock, Hash, TrendingUp, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import {
    RefreshControl,
    ScrollView,
    Pressable,
    View,
    StyleSheet,
    Alert,
} from 'react-native';

export default function TopicAnalyticsScreen() {
    const { topic: encodedTopic } = useLocalSearchParams<{ topic: string }>();
    const topic = decodeURIComponent(encodedTopic || '');
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const router = useRouter();

    const [stats, setStats] = React.useState({ totalTime: 0, sessionCount: 0, averageTime: 0 });
    const [dailyStats, setDailyStats] = React.useState<Map<string, number>>(new Map());
    const [refreshing, setRefreshing] = React.useState(false);
    const [sessions, setSessions] = React.useState<any[]>([]);

    const loadData = React.useCallback(async () => {
        if (!topic) return;
        try {
            const topicStats = await getTopicStats(topic);
            setStats(topicStats);
            const daily = await getTopicDailyStats(topic, 30);
            setDailyStats(daily);

            const topicSessions = await getSessionsByTopic(topic);
            setSessions(topicSessions);
        } catch (error) {
            console.error('Failed to load topic stats:', error);
        }
    }, [topic]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // Group sessions by date
    const groupedSessions = React.useMemo(() => {
        const groups: { date: string; sessions: any[] }[] = [];
        let currentDate = '';

        sessions.forEach((session) => {
            const dateStr = new Date(session.start_time).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            if (dateStr !== currentDate) {
                currentDate = dateStr;
                groups.push({ date: dateStr, sessions: [session] });
            } else {
                groups[groups.length - 1].sessions.push(session);
            }
        });

        return groups;
    }, [sessions]);

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleDelete = async () => {
        Alert.alert(
            'Delete Topic',
            `Delete all sessions for "${topic}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTopic(topic);
                            router.back();
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to delete topic');
                        }
                    },
                },
            ]
        );
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.foreground,
                    headerTitle: topic,
                    headerLeft: () => (
                        <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
                            <ArrowLeft size={24} color={colors.foreground} />
                        </Pressable>
                    ),
                    headerRight: () => (
                        <Pressable onPress={handleDelete} style={{ marginRight: 0 }}>
                            <Trash2 size={24} color={colors.destructive} />
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
                            tintColor={colors.primary}
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
                            icon={TrendingUp}
                            label="Avg. Session"
                            value={formatDuration(Math.round(stats.averageTime))}
                        />
                    </View>

                    {/* Daily Chart */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                            Daily Focus
                        </Text>
                        <DailyReport data={dailyStats} />
                    </View>

                    {/* Session History */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                            Previous Sessions
                        </Text>
                        {sessions.length === 0 ? (
                            <Text variant="muted">No sessions recorded yet.</Text>
                        ) : (
                            <View style={{ gap: 16 }}>
                                {groupedSessions.map((group, index) => (
                                    <View key={index}>
                                        <Text variant="muted" style={styles.groupDate}>{group.date}</Text>
                                        <View style={{ gap: 8 }}>
                                            {group.sessions.map((session) => (
                                                <View
                                                    key={session.id}
                                                    style={[styles.sessionItem, { backgroundColor: colors.card }]}
                                                >
                                                    <Text style={{ color: colors.foreground }}>
                                                        {formatTime(session.start_time)}
                                                        {session.end_time && ` - ${formatTime(session.end_time)}`}
                                                    </Text>
                                                    <Text style={{ fontWeight: '600', color: colors.primary }}>
                                                        {formatDuration(session.duration_seconds)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
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
    groupDate: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sessionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
    },
});
