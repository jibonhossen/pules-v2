import { Text } from '@/components/ui/Text';
import { StatsCard } from '@/components/StatsCard';
import { DailyReport } from '@/components/DailyReport';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getFolderById, getFolderStats, getFolderDailyStatsForRange, getTopicsByFolder, getFolderStatsForRange } from '@/lib/database';
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

type ViewMode = 'week' | 'month';

export default function FolderAnalyticsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const router = useRouter();

    const [folderName, setFolderName] = React.useState('');
    const [folderColor, setFolderColor] = React.useState(colors.primary);
    const [stats, setStats] = React.useState({ totalTime: 0, sessionCount: 0, topicCount: 0 });
    const [chartData, setChartData] = React.useState<Map<string, number>>(new Map());
    const [topics, setTopics] = React.useState<{ topic: string; totalTime: number }[]>([]);
    const [refreshing, setRefreshing] = React.useState(false);

    // View State
    const [viewMode, setViewMode] = React.useState<ViewMode>('week'); // Default to week
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const getDateRange = React.useCallback(() => {
        const start = new Date(currentDate);
        const end = new Date(currentDate);

        if (viewMode === 'week') {
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
            const offset = current.getTimezoneOffset() * 60000;
            const dateStr = new Date(current.getTime() - offset).toISOString().split('T')[0];
            days.push({
                date: new Date(current),
                dateStr: dateStr,
                dayLabel: current.toLocaleDateString('en-US', { weekday: 'short' }),
            });
            current.setDate(current.getDate() + 1);
        }
        return days;
    }, [getDateRange]);

    const loadData = React.useCallback(async () => {
        if (!id) return;
        try {
            const folder = await getFolderById(Number(id));
            if (folder) {
                setFolderName(folder.name);
                setFolderColor(folder.color);
            }

            const { start, end } = getDateRange();
            const folderStats = await getFolderStatsForRange(Number(id), start.toISOString(), end.toISOString());
            setStats(folderStats);

            const daily = await getFolderDailyStatsForRange(Number(id), start.toISOString(), end.toISOString());
            setChartData(daily);

            const topicList = await getTopicsByFolder(Number(id));
            setTopics(topicList);
        } catch (error) {
            console.error('Failed to load folder stats:', error);
        }
    }, [id, getDateRange]);

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

    const canGoNext = React.useMemo(() => {
        const today = new Date();
        const { end } = getDateRange();
        return end < today || (end.toDateString() === today.toDateString()) ? false : true;
    }, [getDateRange]);

    // Label
    const dateLabel = React.useMemo(() => {
        const { start, end } = getDateRange();
        if (viewMode === 'month') {
            return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else {
            if (start.getMonth() === end.getMonth()) {
                return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}`;
            }
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
    }, [getDateRange, viewMode]);

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
                        <DailyReport
                            data={chartData}
                            label={dateLabel}
                            onPrev={handlePrev}
                            onNext={handleNext}
                            canGoNext={!canGoNext}
                            mode={viewMode}
                            days={getDaysArray()}
                        />
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
