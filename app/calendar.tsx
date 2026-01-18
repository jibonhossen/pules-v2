import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';

export default function CalendarScreen() {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                <CalendarIcon size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Calendar</Text>
            <Text variant="muted" style={styles.subtitle}>
                Calendar view coming soon...
            </Text>
            <Text variant="muted" style={styles.description}>
                You'll be able to view your focus sessions organized by date.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        padding: 24,
        borderRadius: 32,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
