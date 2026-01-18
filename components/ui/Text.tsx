import * as React from 'react';
import { Text as RNText, type TextProps, StyleSheet } from 'react-native';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ThemedTextProps extends TextProps {
    variant?: 'default' | 'muted' | 'primary' | 'heading' | 'label';
}

export function Text({ style, variant = 'default', ...props }: ThemedTextProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const variantStyles = {
        default: { color: colors.foreground },
        muted: { color: colors.mutedForeground },
        primary: { color: colors.primary },
        heading: { color: colors.foreground, fontWeight: '700' as const },
        label: { color: colors.mutedForeground, fontSize: 12 },
    };

    return (
        <RNText
            style={[styles.base, variantStyles[variant], style]}
            {...props}
        />
    );
}

const styles = StyleSheet.create({
    base: {
        fontSize: 16,
    },
});
