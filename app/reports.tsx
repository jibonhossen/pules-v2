import { DailyReport } from '@/components/DailyReport';
import { Heatmap } from '@/components/Heatmap';
import { StatsCard } from '@/components/StatsCard';
import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { getDailyStats } from '@/lib/database';
import { useSessionStore } from '@/store/sessions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDuration } from '@/lib/utils';
import { Clock, Flame, Target } from 'lucide-react-native';
import * as React from 'react';
import { RefreshControl, ScrollView, View, StyleSheet } from 'react-native';

export default function ReportsScreen() {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const { totalFocusTime, currentStreak, loadStats } = useSessionStore();
    const [dailyData, setDailyData] = React.useState<Map<string, number>>(new Map());
    const [refreshing, setRefreshing] = React.useState(false);

    const loadData = React.useCallback(async () => {
        await loadStats();
        const stats = await getDailyStats(90);
        setDailyData(stats);
    }, [loadStats]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // Get today's focus time
    const todayStr = new Date().toISOString().split('T')[0];
    const todayFocusTime = dailyData.get(todayStr) || 0;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
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
                <Text style={[styles.title, { color: colors.foreground }]}>Reports</Text>
                <Text variant="muted" style={styles.subtitle}>
                    Track your productivity over time
                </Text>
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
                        value={formatDuration(totalFocusTime)}
                        subtitle="All time"
                    />
                    <StatsCard
                        icon={Flame}
                        label="Streak"
                        value={`${currentStreak}`}
                        subtitle={currentStreak === 1 ? 'day' : 'days'}
                    />
                </View>
            </View>

            {/* Daily Report */}
            <View style={styles.chartSection}>
                <DailyReport data={dailyData} />
            </View>

            {/* Heatmap */}
            <View style={styles.chartSection}>
                <Heatmap data={dailyData} weeks={12} />
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
        marginTop: 24,
        paddingHorizontal: 20,
    },
});
