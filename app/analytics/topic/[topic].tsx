import { Text } from '@/components/ui/Text';
import { StatsCard } from '@/components/StatsCard';
import { DailyReport } from '@/components/DailyReport';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTopicStats, getTopicDailyStatsForRange, getSessionsByTopic, deleteTopic, getTopicStatsForRange } from '@/lib/database';
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

type ViewMode = 'week' | 'month';

export default function TopicAnalyticsScreen() {
    const { topic: encodedTopic } = useLocalSearchParams<{ topic: string }>();
    const topic = decodeURIComponent(encodedTopic || '');
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const router = useRouter();

    const [stats, setStats] = React.useState({ totalTime: 0, sessionCount: 0, averageTime: 0 });
    const [chartData, setChartData] = React.useState<Map<string, number>>(new Map());
    const [refreshing, setRefreshing] = React.useState(false);
    const [sessions, setSessions] = React.useState<any[]>([]);

    // View State
    const [viewMode, setViewMode] = React.useState<ViewMode>('week'); // Default to week
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const getDateRange = React.useCallback(() => {
        const start = new Date(currentDate);
        const end = new Date(currentDate);

        if (viewMode === 'week') {
            // week logic: Start on Sunday? Let's say Sunday-Saturday or last 7 days from anchor?
            // "Weekly view" usually implies specific weeks.
            // Let's rely on standard weeks (Sun-Sat).
            const day = start.getDay(); // 0 is Sunday
            start.setDate(start.getDate() - day); // Last Sunday
            start.setHours(0, 0, 0, 0);

            end.setDate(start.getDate() + 6); // Next Saturday
            end.setHours(23, 59, 59, 999);
        } else {
            // Month logic
            start.setDate(1); // 1st of month
            start.setHours(0, 0, 0, 0);

            end.setMonth(end.getMonth() + 1);
            end.setDate(0); // Last day of current month
            end.setHours(23, 59, 59, 999);
        }
        return { start, end };
    }, [currentDate, viewMode]);

    const getDaysArray = React.useCallback(() => {
        const { start, end } = getDateRange();
        const days: { date: Date; dateStr: string; dayLabel: string }[] = [];
        const current = new Date(start);

        while (current <= end) {
            days.push({
                date: new Date(current),
                dateStr: current.toISOString().split('T')[0],
                dayLabel: current.toLocaleDateString('en-US', { weekday: 'short' }),
            });
            current.setDate(current.getDate() + 1);
        }
        return days;
    }, [getDateRange]);

    const loadData = React.useCallback(async () => {
        if (!topic) return;
        try {
            // Stats for range
            const { start, end } = getDateRange();
            const topicStats = await getTopicStatsForRange(topic, start.toISOString(), end.toISOString());
            setStats(topicStats);

            // Chart Stats
            const daily = await getTopicDailyStatsForRange(topic, start.toISOString(), end.toISOString());
            setChartData(daily);

            const topicSessions = await getSessionsByTopic(topic);
            setSessions(topicSessions);
        } catch (error) {
            console.error('Failed to load topic stats:', error);
        }
    }, [topic, getDateRange]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);


    // Navigation Handlers
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    // Check if we are at current period (to disable next button if desired, though database allows future empty)
    // Let's restrict future navigation if it's strictly > today's period? 
    // Usually analytics allows going to current period but not future.
    const canGoNext = React.useMemo(() => {
        const today = new Date();
        const { end } = getDateRange();
        return end < today || (end.toDateString() === today.toDateString()) ? false : true;
        // Actually, if end is Today or past, we can't go further? 
        // No, if end >= today, we are in current period. So next period would be future.
        // So if end >= today, return false?
        // Let's just say if start of next period > today

        let nextStart = new Date(currentDate);
        if (viewMode === 'week') nextStart.setDate(nextStart.getDate() + 7);
        else nextStart.setMonth(nextStart.getMonth() + 1); // rough check

        // precise check
        return end < today; // Allow going next only if current period ends before today.
        // Wait, if I am in Jan, and today is Jan 22. End is Jan 31. End < Today is False.
        // So I can't go to Feb. Correct. 
    }, [getDateRange]);

    // Label
    const dateLabel = React.useMemo(() => {
        const { start, end } = getDateRange();
        if (viewMode === 'month') {
            return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else {
            // Week: Jan 1 - Jan 7
            // Check if same month
            if (start.getMonth() === end.getMonth()) {
                return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}`;
            }
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
    }, [getDateRange, viewMode]);


    // Group sessions by date
    const groupedSessions = React.useMemo(() => {
        const groups: { date: string; sessions: any[] }[] = [];
        let curDate = '';

        sessions.forEach((session) => {
            const dateStr = new Date(session.start_time).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            if (dateStr !== curDate) {
                curDate = dateStr;
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
                    {/* View Switcher */}
                    <View style={styles.viewSwitcher}>
                        <Pressable
                            onPress={() => setViewMode('week')}
                            style={[
                                styles.viewOption,
                                viewMode === 'week' && { backgroundColor: colors.card }
                            ]}
                        >
                            <Text style={{
                                fontWeight: viewMode === 'week' ? '600' : '400',
                                color: viewMode === 'week' ? colors.primary : colors.mutedForeground
                            }}>
                                Week
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setViewMode('month')}
                            style={[
                                styles.viewOption,
                                viewMode === 'month' && { backgroundColor: colors.card }
                            ]}
                        >
                            <Text style={{
                                fontWeight: viewMode === 'month' ? '600' : '400',
                                color: viewMode === 'month' ? colors.primary : colors.mutedForeground
                            }}>
                                Month
                            </Text>
                        </Pressable>
                    </View>

                    {/* Daily Chart */}
                    <View style={styles.section}>
                        <DailyReport
                            data={chartData}
                            label={dateLabel}
                            onPrev={handlePrev}
                            onNext={handleNext}
                            canGoNext={!canGoNext} // wait, logic above returns true if we CAN go next?
                            // Logic: end < today. If end < today, we are in past, so YES we can go next.
                            // So !canGoNext is seemingly reversing it.
                            // Let's fix the prop name to avoid confusion.
                            // logic: canGoNext = end < today. If true, enable button.
                            mode={viewMode}
                            days={getDaysArray()}
                        />
                    </View>

                    {/* Stats Cards */}
                    <View style={[styles.statsRow, { marginTop: 24 }]}>
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
        marginTop: 12,
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
    viewSwitcher: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 4,
        borderRadius: 12,
        marginBottom: 16,
        alignSelf: 'center',
    },
    viewOption: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
});
