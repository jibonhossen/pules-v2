import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, Dimensions, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface DailyBarProps {
    day: string;
    hours: number;
    maxHours: number;
    isToday: boolean;
    isCurrentWeek: boolean;
}

function DailyBar({ day, hours, maxHours, isToday, isCurrentWeek }: DailyBarProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const height = maxHours > 0 ? Math.max((hours / maxHours) * 100, hours > 0 ? 8 : 0) : 0;

    return (
        <View style={styles.barContainer}>
            <View style={styles.barWrapper}>
                <View
                    style={[
                        styles.bar,
                        {
                            height: `${height}%`,
                            backgroundColor: isToday && isCurrentWeek ? colors.primary : colors.secondary,
                            minHeight: hours > 0 ? 4 : 0,
                        },
                    ]}
                />
            </View>
            <Text
                style={[
                    styles.barLabel,
                    {
                        color: isToday && isCurrentWeek ? colors.primary : colors.mutedForeground,
                        fontWeight: isToday && isCurrentWeek ? '700' : '400',
                    },
                ]}
            >
                {day}
            </Text>
            <Text variant="muted" style={styles.barValue}>
                {hours >= 1 ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m` : hours > 0 ? `${Math.round(hours * 60)}m` : '-'}
            </Text>
        </View>
    );
}

interface DailyReportProps {
    data: Map<string, number>;
}

export function DailyReport({ data }: DailyReportProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const [weekOffset, setWeekOffset] = React.useState(0);
    const translateX = useSharedValue(0);
    const animatedOpacity = useSharedValue(1);

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

    const maxHours = Math.max(...dailyHours, 1);
    const totalSeconds = dailyHours.reduce((sum, h) => sum + h * 3600, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.round((totalSeconds % 3600) / 60);
    const avgSeconds = totalSeconds / 7;
    const avgHours = Math.floor(avgSeconds / 3600);
    const avgMinutes = Math.round((avgSeconds % 3600) / 60);

    const animateTransition = (direction: 'left' | 'right', callback: () => void) => {
        const exitX = direction === 'left' ? -50 : 50;
        const enterX = direction === 'left' ? 50 : -50;

        animatedOpacity.value = withTiming(0, { duration: 150 });
        translateX.value = withTiming(exitX, { duration: 150 }, () => {
            runOnJS(callback)();
            translateX.value = enterX;
            translateX.value = withTiming(0, { duration: 200 });
            animatedOpacity.value = withTiming(1, { duration: 150 });
        });
    };

    const goToPreviousWeek = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        animateTransition('right', () => setWeekOffset((prev) => prev + 1));
    };

    const goToNextWeek = () => {
        if (weekOffset > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            animateTransition('left', () => setWeekOffset((prev) => prev - 1));
        }
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX([-20, 20])
        .onUpdate((event) => {
            translateX.value = event.translationX * 0.5;
        })
        .onEnd((event) => {
            if (event.translationX > SWIPE_THRESHOLD || event.velocityX > 500) {
                runOnJS(goToPreviousWeek)();
            } else if ((event.translationX < -SWIPE_THRESHOLD || event.velocityX < -500) && weekOffset > 0) {
                runOnJS(goToNextWeek)();
            } else {
                translateX.value = withTiming(0, { duration: 200 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: animatedOpacity.value,
    }));

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
                        <Text variant="muted" style={styles.statLabel}>Daily Avg</Text>
                        <Text style={[styles.statValue, { color: colors.primary }]}>
                            {avgHours > 0 ? `${avgHours}h ` : ''}{avgMinutes}m
                        </Text>
                    </View>
                </View>
            </View>

            {/* Bar Chart */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[animatedStyle, styles.barsContainer]}>
                    {days.map((d, index) => (
                        <DailyBar
                            key={d.dateStr}
                            day={d.dayLabel}
                            hours={dailyHours[index]}
                            maxHours={maxHours}
                            isToday={d.dateStr === todayStr}
                            isCurrentWeek={weekOffset === 0}
                        />
                    ))}
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    navigation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    navButton: {
        borderRadius: 20,
        padding: 4,
    },
    weekLabel: {
        fontSize: 16,
        fontWeight: '600',
        minWidth: 100,
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
        fontSize: 12,
    },
    statValue: {
        fontWeight: '600',
    },
    barsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barWrapper: {
        width: '100%',
        height: 120,
        justifyContent: 'flex-end',
        overflow: 'hidden',
        borderRadius: 6,
    },
    bar: {
        width: '100%',
        borderRadius: 6,
    },
    barLabel: {
        marginTop: 8,
        fontSize: 12,
    },
    barValue: {
        fontSize: 12,
    },
});
