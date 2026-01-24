import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { X } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

export const TOPIC_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#EAB308', // Yellow
    '#84CC16', // Lime
    '#22C55E', // Green
    '#10B981', // Emerald
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#D946EF', // Fuchsia
    '#EC4899', // Pink
    '#F43F5E', // Rose
];

interface TopicColorPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (color: string) => void;
    selectedColor?: string | null;
}

export function TopicColorPicker({ visible, onClose, onSelect, selectedColor }: TopicColorPickerProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={[styles.content, { backgroundColor: colors.card }]}>
                    <View style={styles.header}>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={20} color={colors.mutedForeground} />
                        </Pressable>
                    </View>
                    <View style={styles.grid}>
                        {TOPIC_COLORS.map((color) => (
                            <Pressable
                                key={color}
                                onPress={() => {
                                    onSelect(color);
                                    onClose();
                                }}
                                style={[
                                    styles.colorButton,
                                    { backgroundColor: color },
                                    selectedColor === color && styles.selected,
                                    selectedColor === color && { borderColor: colors.foreground }
                                ]}
                            />
                        ))}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 320,
        padding: 20,
        borderRadius: 16,
    },
    header: {
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    closeButton: {
        padding: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    colorButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    selected: {
        borderWidth: 3,
    },
});
