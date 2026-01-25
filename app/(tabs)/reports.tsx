import { DailyReport } from '@/components/DailyReport';
import { Heatmap } from '@/components/Heatmap';
import { StatsCard } from '@/components/StatsCard';
import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDailyStats, getDatabase, getStatsForRange, Session } from '@/lib/database';
import { formatDuration } from '@/lib/utils';
import { useSessionStore } from '@/store/sessions';
import { useRouter } from 'expo-router';
import { Clock, Flame, Hash, Settings, Target } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ViewMode = 'week' | 'month';

async function getDailyMapForRange(startDate: string, endDate: string): Promise<Map<string, number>> {
    const database = await getDatabase();
    const sessions = await database.getAllAsync<Session>(
        `SELECT * FROM sessions 
         WHERE start_time >= ? AND start_time <= ? AND end_time IS NOT NULL
         ORDER BY start_time`,
        [startDate, endDate]
    );

    const dailyMap = new Map<string, number>();
    sessions.forEach((session) => {
        const d = new Date(session.start_time);
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset).toISOString().split('T')[0];

        const current = dailyMap.get(localDate) || 0;
        dailyMap.set(localDate, current + (session.duration_seconds || 0));
    });
    return dailyMap;
}


export default function ReportsScreen() {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';
    const { currentStreak, loadStats } = useSessionStore();
    const [stats, setStats] = React.useState({ totalTime: 0, sessionCount: 0, averageTime: 0 });
    const [dailyData, setDailyData] = React.useState<Map<string, number>>(new Map());
    const [heatmapData, setHeatmapData] = React.useState<Map<string, number>>(new Map());
    const [refreshing, setRefreshing] = React.useState(false);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // View State
    const [viewMode, setViewMode] = React.useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const getDateRange = React.useCallback(() => {
        const start = new Date(currentDate);
        const end = new Date(currentDate);

        if (viewMode === 'week') {
            const day = start.getDay();
            start.setDate(start.getDate() - day);
            start.setHours(0, 0, 0, 0);

            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);

            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
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
        await loadStats();

        // Heatmap data (always long range)
        const stats = await getDailyStats(90);
        setHeatmapData(stats);

        // Chart data & Stats (range based)
        const { start, end } = getDateRange();

        // Use local helper for chart daily map
        const rangeMap = await getDailyMapForRange(start.toISOString(), end.toISOString());
        setDailyData(rangeMap);

        // Use DB helper for summary stats
        const rangeStats = await getStatsForRange(start.toISOString(), end.toISOString());
        setStats(rangeStats);

    }, [loadStats, getDateRange]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);


    // Handlers
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const canGoNext = React.useMemo(() => {
        const today = new Date();
        const { end } = getDateRange();
        return end < today || (end.toDateString() === today.toDateString()) ? false : true;
    }, [getDateRange]);

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

    // Get today's focus time
    // Get today's focus time
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const todayStr = new Date(today.getTime() - offset).toISOString().split('T')[0];
    const todayFocusTime = heatmapData.get(todayStr) || 0; // Use heatmapData as source of truth for "Today" regardless of view

    return (
        <ScrollView
            style={[
                styles.container,
                {
                    backgroundColor: colors.background,
                    marginTop: insets.top,
                }
            ]}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTextContainer}>
                        <Text style={[styles.title, { color: colors.foreground }]}>Reports</Text>
                        <Text variant="muted" style={styles.subtitle}>
                            Track your productivity over time
                        </Text>
                    </View>
                    <Pressable
                        style={[
                            styles.settingsButton,
                            { backgroundColor: isDark ? 'rgba(39, 39, 42, 0.6)' : 'rgba(0, 0, 0, 0.05)' }
                        ]}
                        onPress={() => router.push('/settings')}
                    >
                        <Settings size={22} color={colors.foreground} />
                    </Pressable>
                </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsSection}>
                {/* Today's Focus - Full Width */}
                <StatsCard
                    icon={Target}
                    label="Today's Focus"
                    value={formatDuration(todayFocusTime)}
                    subtitle="Keep it up!"
                />

                {/* Total and Streak - Row */}
                <View style={styles.statsRow}>
                    <StatsCard
                        icon={Clock}
                        label="Total Focus"
                        value={formatDuration(stats.totalTime)}
                        subtitle={viewMode === 'week' ? "This Week" : "This Month"}
                    />
                    <StatsCard
                        icon={Hash}
                        label="Sessions"
                        value={`${stats.sessionCount}`}
                        subtitle={viewMode === 'week' ? "This Week" : "This Month"}
                    />
                </View>

                <View style={styles.statsRow}>
                    <StatsCard
                        icon={Flame}
                        label="Streak"
                        value={`${currentStreak}`}
                        subtitle={currentStreak === 1 ? 'day' : 'days'}
                    />
                </View>
            </View>

            {/* View Switcher */}
            <View style={[styles.viewSwitcher, { marginTop: 24 }]}>
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

            {/* Daily Report */}
            <View style={styles.chartSection}>
                <DailyReport
                    data={dailyData}
                    label={dateLabel}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    canGoNext={!canGoNext}
                    mode={viewMode}
                    days={getDaysArray()}
                />
            </View>

            {/* Heatmap */}
            <View style={styles.chartSection}>
                <Heatmap data={heatmapData} weeks={12} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerTextContainer: {
        flex: 1,
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 14,
    },
    statsSection: {
        paddingHorizontal: 20,
        gap: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    chartSection: {
        marginTop: 12,
        paddingHorizontal: 20,
    },
    viewSwitcher: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 4,
        borderRadius: 12,
        alignSelf: 'center',
    },
    viewOption: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
});
