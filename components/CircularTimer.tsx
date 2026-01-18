import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    Easing,
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Text } from './ui/Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularTimerProps {
    elapsedSeconds: number;
    isRunning: boolean;
    size?: number;
    strokeWidth?: number;
    targetMinutes?: number;
}

export function CircularTimer({
    elapsedSeconds,
    isRunning,
    size = 280,
    strokeWidth = 12,
    targetMinutes = 25,
}: CircularTimerProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Pulsing animation for the glow effect
    const pulseOpacity = useSharedValue(0.3);

    React.useEffect(() => {
        if (isRunning) {
            pulseOpacity.value = withRepeat(
                withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        } else {
            pulseOpacity.value = withTiming(0.3, { duration: 300 });
        }
    }, [isRunning]);

    // Progress calculation
    const targetSeconds = targetMinutes * 60;
    const progress = useDerivedValue(() => {
        return Math.min(elapsedSeconds / targetSeconds, 1);
    }, [elapsedSeconds, targetSeconds]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - progress.value),
    }));

    // Format time display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatHours = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    return (
        <View style={styles.container}>
            {/* Glow effect */}
            {isRunning && (
                <Animated.View
                    style={[
                        styles.glow,
                        {
                            width: size + 40,
                            height: size + 40,
                            borderRadius: (size + 40) / 2,
                            backgroundColor: colors.primary,
                            opacity: pulseOpacity,
                        },
                    ]}
                />
            )}

            <View style={{ width: size, height: size }}>
                <Svg width={size} height={size}>
                    <Defs>
                        <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={colors.accent} />
                            <Stop offset="100%" stopColor={colors.primary} />
                        </LinearGradient>
                    </Defs>

                    {/* Background circle */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={colors.muted}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />

                    {/* Progress circle */}
                    <AnimatedCircle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="url(#gradient)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        animatedProps={animatedProps}
                        rotation="-90"
                        origin={`${size / 2}, ${size / 2}`}
                    />
                </Svg>

                {/* Time display */}
                <View style={styles.timeContainer}>
                    <Text
                        style={[
                            styles.timeText,
                            { color: colors.foreground },
                        ]}
                    >
                        {formatTime(elapsedSeconds)}
                    </Text>
                    {elapsedSeconds > 0 && (
                        <Text variant="muted" style={styles.durationText}>
                            {formatHours(elapsedSeconds)} focused
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
    },
    timeContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeText: {
        fontSize: 48,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
        letterSpacing: -1,
    },
    durationText: {
        marginTop: 8,
        fontSize: 14,
    },
});
