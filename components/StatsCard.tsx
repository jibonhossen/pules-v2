import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/Text';

interface StatsCardProps {
    icon: LucideIcon;
    label: string;
    value: string;
    subtitle?: string;
}

export function StatsCard({ icon: Icon, label, value, subtitle }: StatsCardProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                    <Icon size={18} color={colors.primary} strokeWidth={2} />
                </View>
                <Text variant="muted" style={styles.label}>{label}</Text>
            </View>
            <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
            {subtitle && (
                <Text variant="muted" style={styles.subtitle}>{subtitle}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    iconContainer: {
        borderRadius: 12,
        padding: 8,
    },
    label: {
        fontSize: 14,
    },
    value: {
        fontSize: 32,
        fontWeight: '700',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 12,
    },
});
