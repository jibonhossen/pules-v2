import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';
import * as React from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

const FOLDER_COLORS = [
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#eab308', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#ef4444', // Red
];

interface CreateFolderModalProps {
    visible: boolean;
    folder?: { id: string; name: string; color: string } | null;
    onClose: () => void;
    onSave: (name: string, color: string) => void;
}

export function CreateFolderModal({
    visible,
    folder,
    onClose,
    onSave,
}: CreateFolderModalProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const [name, setName] = React.useState('');
    const [selectedColor, setSelectedColor] = React.useState(FOLDER_COLORS[0]);

    React.useEffect(() => {
        if (visible) {
            if (folder) {
                setName(folder.name);
                setSelectedColor(folder.color);
            } else {
                setName('');
                setSelectedColor(FOLDER_COLORS[0]);
            }
        }
    }, [visible, folder]);

    const handleSave = () => {
        if (!name.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(name.trim(), selectedColor);
        onClose();
    };

    const handleColorSelect = (color: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedColor(color);
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: colors.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.foreground }]}>
                            {folder ? 'Edit Folder' : 'New Folder'}
                        </Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={22} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    {/* Name input */}
                    <View style={styles.inputContainer}>
                        <Text variant="muted" style={styles.label}>Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Folder name"
                            placeholderTextColor={colors.mutedForeground}
                            autoFocus
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.muted,
                                    color: colors.foreground,
                                    borderColor: selectedColor,
                                },
                            ]}
                        />
                    </View>

                    {/* Color picker */}
                    <View style={styles.colorContainer}>
                        <Text variant="muted" style={styles.label}>Color</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.colorGrid}
                        >
                            {FOLDER_COLORS.map((color) => (
                                <Pressable
                                    key={color}
                                    onPress={() => handleColorSelect(color)}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color },
                                        selectedColor === color && styles.colorSelected,
                                    ]}
                                >
                                    {selectedColor === color && (
                                        <Check size={18} color="#fff" strokeWidth={3} />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Preview */}
                    <View style={styles.previewContainer}>
                        <Text variant="muted" style={styles.label}>Preview</Text>
                        <View style={[styles.preview, { backgroundColor: colors.muted }]}>
                            <View style={[styles.previewDot, { backgroundColor: selectedColor }]} />
                            <Text style={[styles.previewText, { color: colors.foreground }]}>
                                {name || 'Folder name'}
                            </Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable
                            onPress={onClose}
                            style={[styles.button, styles.cancelButton, { backgroundColor: colors.muted }]}
                        >
                            <Text style={{ color: colors.foreground }}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSave}
                            disabled={!name.trim()}
                            style={[
                                styles.button,
                                styles.saveButton,
                                { backgroundColor: selectedColor, opacity: name.trim() ? 1 : 0.5 },
                            ]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>
                                {folder ? 'Save' : 'Create'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modal: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        marginBottom: 8,
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 2,
    },
    colorContainer: {
        marginBottom: 20,
    },
    colorGrid: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 4,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorSelected: {
        transform: [{ scale: 1.1 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    previewContainer: {
        marginBottom: 24,
    },
    preview: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        gap: 12,
    },
    previewDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    previewText: {
        fontSize: 15,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {},
    saveButton: {},
});
