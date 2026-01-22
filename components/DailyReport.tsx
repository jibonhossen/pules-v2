import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, Dimensions, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BarChart } from 'react-native-gifted-charts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DailyReportProps {
    data: Map<string, number>;
}

export function DailyReport({ data }: DailyReportProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const [weekOffset, setWeekOffset] = React.useState(0);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const getWeekDays = (offset: number) => {
        const days: { date: Date; dateStr: string; dayLabel: string }[] = [];
        const referenceDate = new Date(today);
        referenceDate.setDate(today.getDate() - (offset * 7));

        for (let i = 6; i >= 0; i--) {
            const date = new Date(referenceDate);
            date.setDate(referenceDate.getDate() - i);
            days.push({
                date,
                dateStr: date.toISOString().split('T')[0],
                dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
            });
        }
        return days;
    };

    const days = getWeekDays(weekOffset);

    const weekStart = days[0].date;
    const weekEnd = days[6].date;
    const weekLabel = weekOffset === 0
        ? 'This Week'
        : weekOffset === 1
            ? 'Last Week'
            : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    const dailyHours = days.map((d) => {
        const seconds = data.get(d.dateStr) || 0;
        return seconds / 3600;
    });

    const totalSeconds = dailyHours.reduce((sum, h) => sum + h * 3600, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.round((totalSeconds % 3600) / 60);
    const avgSeconds = totalSeconds / 7;
    const avgHours = Math.floor(avgSeconds / 3600);
    const avgMinutes = Math.round((avgSeconds % 3600) / 60);

    const goToPreviousWeek = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setWeekOffset((prev) => prev + 1);
    };

    const goToNextWeek = () => {
        if (weekOffset > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setWeekOffset((prev) => prev - 1);
        }
    };

    // Chart Data Preparation
    const barData = days.map((d, index) => {
        const hours = dailyHours[index];
        const isToday = d.dateStr === todayStr && weekOffset === 0;
        const color = isToday ? colors.primary : '#A0A0A0'; // Muted grey for non-today

        return {
            value: hours,
            label: d.dayLabel,
            frontColor: color,
            topLabelComponent: () => hours > 0 ? (
                <Text style={{ fontSize: 10, marginBottom: 4, width: 30, textAlign: 'center', color: colors.mutedForeground }}>
                    {hours < 1 ? Math.round(hours * 60) + 'm' : hours.toFixed(1)}
                </Text>
            ) : null,
        };
    });

    // Find max value for Y-axis scaling, add some buffer
    const maxValue = Math.max(...dailyHours, 1);

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.navigation}>
                    <Pressable
                        onPress={goToPreviousWeek}
                        style={[styles.navButton, { backgroundColor: colors.muted }]}
                    >
                        <ChevronLeft size={20} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.weekLabel, { color: colors.foreground }]}>
                        {weekLabel}
                    </Text>
                    <Pressable
                        onPress={goToNextWeek}
                        disabled={weekOffset === 0}
                        style={[
                            styles.navButton,
                            { backgroundColor: colors.muted, opacity: weekOffset === 0 ? 0.3 : 1 },
                        ]}
                    >
                        <ChevronRight size={20} color={colors.foreground} />
                    </Pressable>
                </View>
                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <Text variant="muted" style={styles.statLabel}>Total</Text>
                        <Text style={[styles.statValue, { color: colors.foreground }]}>
                            {totalHours > 0 ? `${totalHours}h ` : ''}{totalMinutes}m
                        </Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text variant="muted" style={styles.statLabel}>Avg</Text>
                        <Text style={[styles.statValue, { color: colors.primary }]}>
                            {avgHours > 0 ? `${avgHours}h ` : ''}{avgMinutes}m
                        </Text>
                    </View>
                </View>
            </View>

            {/* Bar Chart */}
            <View style={{ alignItems: 'center', marginTop: 10 }}>
                <BarChart
                    data={barData}
                    barWidth={32}
                    spacing={14}
                    barBorderTopLeftRadius={4}
                    barBorderTopRightRadius={4}
                    hideRules
                    xAxisThickness={1}
                    xAxisColor={colors.border}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: colors.mutedForeground, fontSize: 10 }}
                    noOfSections={3}
                    maxValue={maxValue * 1.1}
                    height={180}
                    width={SCREEN_WIDTH - 70}
                    initialSpacing={10}
                    labelTextStyle={{ color: colors.mutedForeground, fontSize: 11 }}
                    hideYAxisText
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 20,
        // Shadow for premium feel
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    navigation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 4,
        paddingHorizontal: 8,
        borderRadius: 20,
    },
    navButton: {
        borderRadius: 16,
        padding: 6,
    },
    weekLabel: {
        fontSize: 14,
        fontWeight: '600',
        minWidth: 90,
        textAlign: 'center',
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statItem: {
        alignItems: 'flex-end',
    },
    statLabel: {
        fontSize: 11,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
    },
});
