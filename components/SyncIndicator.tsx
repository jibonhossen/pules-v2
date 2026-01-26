import { useSyncStore } from '@/store/sync';
import { Cloud, RefreshCw } from 'lucide-react-native';
import * as React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface SyncIndicatorProps {
    color?: string;
    size?: number;
}

export function SyncIndicator({ color = '#2dd4bf', size = 18 }: SyncIndicatorProps) {
    const { status } = useSyncStore();
    const spinValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (status === 'syncing') {
            // Start spinning animation
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            // Reset animation
            spinValue.setValue(0);
        }
    }, [status, spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Only show when syncing
    if (status !== 'syncing') {
        return null;
    }

    return (
        <View style={styles.container}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={size} color={color} />
            </Animated.View>
        </View>
    );
}

// Always visible indicator (shows cloud icon when idle, spinning when syncing)
export function SyncIndicatorPersistent({ color = '#2dd4bf', size = 18 }: SyncIndicatorProps) {
    const { status, lastSyncTime } = useSyncStore();
    const spinValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (status === 'syncing') {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinValue.stopAnimation();
            spinValue.setValue(0);
        }
    }, [status, spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (status === 'syncing') {
        return (
            <View style={styles.container}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <RefreshCw size={size} color={color} />
                </Animated.View>
            </View>
        );
    }

    // Show cloud icon when idle (only if user has synced before)
    if (lastSyncTime) {
        return (
            <View style={styles.container}>
                <Cloud size={size} color={color} style={{ opacity: 0.5 }} />
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        padding: 4,
    },
});
