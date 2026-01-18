import { PULSE_COLORS, HEATMAP_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/Text';

interface HeatmapProps {
    data: Map<string, number>;
    weeks?: number;
}

function getColorForHours(hours: number, colors: typeof PULSE_COLORS.dark): string {
    if (hours === 0) return colors.muted;
    if (hours < 0.5) return HEATMAP_COLORS.low;
    if (hours < 1) return HEATMAP_COLORS.medium;
    if (hours < 2) return HEATMAP_COLORS.high;
    return HEATMAP_COLORS.max;
}

function formatDateLabel(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short' });
}

export function Heatmap({ data, weeks = 12 }: HeatmapProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const CELL_SIZE = 14;
    const CELL_GAP = 3;
    const DAYS_IN_WEEK = 7;

    // Generate dates for the grid (past N weeks)
    const generateDates = (): Date[][] => {
        const result: Date[][] = [];
        const today = new Date();
        const dayOfWeek = today.getDay();

        // Start from the beginning of the current week
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek - (weeks - 1) * 7);

        for (let week = 0; week < weeks; week++) {
            const weekDates: Date[] = [];
            for (let day = 0; day < DAYS_IN_WEEK; day++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + week * 7 + day);
                weekDates.push(date);
            }
            result.push(weekDates);
        }

        return result;
    };

    const dates = generateDates();
    const today = new Date().toISOString().split('T')[0];

    // Get month labels
    const monthLabels: { month: string; position: number }[] = [];
    let lastMonth = -1;
    dates.forEach((week, weekIndex) => {
        const firstDayOfWeek = week[0];
        if (firstDayOfWeek.getMonth() !== lastMonth) {
            lastMonth = firstDayOfWeek.getMonth();
            monthLabels.push({
                month: formatDateLabel(firstDayOfWeek),
                position: weekIndex,
            });
        }
    });

    const weekDayLabels = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>
                Activity Heatmap
            </Text>

            {/* Month labels */}
            <View style={styles.monthLabels}>
                {monthLabels.map((label, index) => (
                    <Text
                        key={index}
                        variant="muted"
                        style={[
                            styles.monthLabel,
                            { left: 28 + label.position * (CELL_SIZE + CELL_GAP) },
                        ]}
                    >
                        {label.month}
                    </Text>
                ))}
            </View>

            <View style={styles.heatmapContent}>
                {/* Day labels */}
                <View style={styles.dayLabels}>
                    {weekDayLabels.map((day, index) => (
                        <View
                            key={index}
                            style={[styles.dayLabelContainer, { height: CELL_SIZE + CELL_GAP }]}
                        >
                            <Text variant="muted" style={styles.dayLabel}>{day}</Text>
                        </View>
                    ))}
                </View>

                {/* Heatmap grid */}
                <View style={styles.grid}>
                    {dates.map((week, weekIndex) => (
                        <View key={weekIndex} style={{ marginRight: CELL_GAP }}>
                            {week.map((date, dayIndex) => {
                                const dateStr = date.toISOString().split('T')[0];
                                const seconds = data.get(dateStr) || 0;
                                const hours = seconds / 3600;
                                const isFuture = dateStr > today;

                                return (
                                    <View
                                        key={dayIndex}
                                        style={[
                                            styles.cell,
                                            {
                                                width: CELL_SIZE,
                                                height: CELL_SIZE,
                                                marginBottom: CELL_GAP,
                                                backgroundColor: isFuture
                                                    ? 'transparent'
                                                    : getColorForHours(hours, colors),
                                                opacity: isFuture ? 0.2 : 1,
                                                borderWidth: isFuture ? 1 : 0,
                                                borderColor: colors.muted,
                                            },
                                        ]}
                                    />
                                );
                            })}
                        </View>
                    ))}
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <Text variant="muted" style={styles.legendLabel}>Less</Text>
                {[0, 0.3, 0.7, 1.5, 3].map((hours, index) => (
                    <View
                        key={index}
                        style={[
                            styles.legendCell,
                            { backgroundColor: getColorForHours(hours, colors) },
                        ]}
                    />
                ))}
                <Text variant="muted" style={styles.legendLabel}>More</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    monthLabels: {
        height: 20,
        marginBottom: 8,
        paddingLeft: 28,
    },
    monthLabel: {
        position: 'absolute',
        fontSize: 12,
    },
    heatmapContent: {
        flexDirection: 'row',
        marginTop: 4,
    },
    dayLabels: {
        marginRight: 8,
        width: 20,
    },
    dayLabelContainer: {
        justifyContent: 'center',
    },
    dayLabel: {
        fontSize: 12,
    },
    grid: {
        flexDirection: 'row',
    },
    cell: {
        borderRadius: 3,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 16,
        gap: 4,
    },
    legendCell: {
        width: 12,
        height: 12,
        borderRadius: 2,
    },
    legendLabel: {
        fontSize: 12,
        marginHorizontal: 4,
    },
});
