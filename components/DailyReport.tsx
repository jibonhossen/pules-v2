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
    label: string;
    onPrev: () => void;
    onNext: () => void;
    canGoNext: boolean;
    mode: 'week' | 'month';
    days: { date: Date; dateStr: string; dayLabel: string }[];
}

export function DailyReport({ data, label, onPrev, onNext, canGoNext, mode, days }: DailyReportProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const todayStr = new Date().toISOString().split('T')[0];

    const dailyHours = days.map((d) => {
        const seconds = data.get(d.dateStr) || 0;
        return seconds / 3600;
    });

    const totalSeconds = dailyHours.reduce((sum, h) => sum + h * 3600, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.round((totalSeconds % 3600) / 60);
    const avgSeconds = totalSeconds / days.length; // Dynamic divisor based on 7 or ~30
    const avgHours = Math.floor(avgSeconds / 3600);
    const avgMinutes = Math.round((avgSeconds % 3600) / 60);

    // Chart Data Preparation
    const barData = days.map((d, index) => {
        const hours = dailyHours[index];
        const isToday = d.dateStr === todayStr;
        const color = isToday ? colors.primary : '#A0A0A0';

        // Adjust labels based on mode
        let displayLabel = d.dayLabel;
        if (mode === 'month') {
            displayLabel = d.date.getDate().toString();
        }

        return {
            value: hours,
            label: displayLabel,
            frontColor: color,
            topLabelComponent: () => hours > 0 && (mode === 'week' || mode === 'month') ? (
                <Text style={{ fontSize: 10, marginBottom: 4, width: 30, textAlign: 'center', color: colors.mutedForeground }}>
                    {hours < 1 ? Math.round(hours * 60) + 'm' : hours.toFixed(1)}
                </Text>
            ) : null,
        };
    });

    const maxValue = Math.max(...dailyHours, 0.1); // Ensure non-zero

    const handlePrev = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPrev();
    };

    const handleNext = () => {
        if (canGoNext) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onNext();
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.navigation}>
                    <Pressable
                        onPress={handlePrev}
                        style={[styles.navButton, { backgroundColor: colors.muted }]}
                    >
                        <ChevronLeft size={20} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.label, { color: colors.foreground }]}>
                        {label}
                    </Text>
                    <Pressable
                        onPress={handleNext}
                        disabled={!canGoNext}
                        style={[
                            styles.navButton,
                            { backgroundColor: colors.muted, opacity: !canGoNext ? 0.3 : 1 },
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
            <View style={{ alignItems: 'center', marginTop: 10, overflow: 'hidden' }}>
                <BarChart
                    key={colorScheme}
                    data={barData}
                    barWidth={mode === 'week' ? 32 : 18}
                    spacing={mode === 'week' ? 14 : 10}
                    barBorderTopLeftRadius={2}
                    barBorderTopRightRadius={2}
                    hideRules
                    xAxisThickness={1}
                    xAxisColor={colors.border}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: colors.mutedForeground, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.mutedForeground, fontSize: 10 }}
                    noOfSections={3}
                    maxValue={maxValue * 1.1}
                    height={180}
                    width={SCREEN_WIDTH - 70}
                    scrollable={mode === 'month'}
                    initialSpacing={10}
                    labelTextStyle={{ color: colors.mutedForeground, fontSize: 10 }}
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
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
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
    label: {
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
