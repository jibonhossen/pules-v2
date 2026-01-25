import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as React from 'react';
import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

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
        heading: { color: colors.foreground, fontFamily: 'Poppins_700Bold' },
        label: { color: colors.mutedForeground, fontSize: 12, fontFamily: 'Poppins_500Medium' },
    };

    const flatStyle = StyleSheet.flatten([styles.base, variantStyles[variant], style]) as TextStyle;

    // Map fontWeight to FontFamily
    let fontFamily = 'Poppins_400Regular';
    const weight = flatStyle.fontWeight;

    if (weight === 'bold' || weight === '700' || weight === '800' || weight === '900') {
        fontFamily = 'Poppins_700Bold';
    } else if (weight === '600') {
        fontFamily = 'Poppins_600SemiBold';
    } else if (weight === '500') {
        fontFamily = 'Poppins_500Medium';
    } else if (flatStyle.fontFamily) {
        fontFamily = flatStyle.fontFamily;
    }

    // Remove fontWeight from style to avoid conflicts, and enforce fontFamily
    const { fontWeight, ...restStyle } = flatStyle;

    return (
        <RNText
            style={[{ fontFamily }, restStyle]}
            {...props}
        />
    );
}

const styles = StyleSheet.create({
    base: {
        fontSize: 16,
    },
});
