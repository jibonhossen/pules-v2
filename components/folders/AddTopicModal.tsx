import { TOPIC_COLORS } from '@/components/TopicColorPicker';
import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import * as React from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Switch,
    TextInput,
    View
} from 'react-native';

interface AddTopicModalProps {
    visible: boolean;
    folderName: string;
    folderColor: string;
    onClose: () => void;
    onSave: (topicName: string, allowBackground: boolean, color: string) => void;
}

export function AddTopicModal({
    visible,
    folderName,
    folderColor,
    onClose,
    onSave,
}: AddTopicModalProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const [topicName, setTopicName] = React.useState('');
    const [allowBackground, setAllowBackground] = React.useState(false);
    const [selectedColor, setSelectedColor] = React.useState<string>(folderColor);

    React.useEffect(() => {
        if (visible) {
            setTopicName('');
            setAllowBackground(false);
            setSelectedColor(folderColor);
        }
    }, [visible, folderColor]);

    const handleSave = () => {
        if (!topicName.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(topicName.trim(), allowBackground, selectedColor);
        onClose();
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
                        <View>
                            <Text style={[styles.title, { color: colors.foreground }]}>
                                Add Topic
                            </Text>
                            <Text variant="muted" style={styles.subtitle}>
                                to {folderName}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={22} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    {/* Topic input */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            value={topicName}
                            onChangeText={setTopicName}
                            placeholder="What are you working on?"
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

                    {/* Color Palette */}
                    <View style={styles.colorContainer}>
                        <Text style={[styles.optionTitle, { color: colors.foreground, marginBottom: 12 }]}>Color</Text>
                        <View style={styles.colorGrid}>
                            {TOPIC_COLORS.map((color) => (
                                <Pressable
                                    key={color}
                                    onPress={() => setSelectedColor(color)}
                                    style={[
                                        styles.colorButton,
                                        { backgroundColor: color },
                                        selectedColor === color && [styles.selectedColor, { borderColor: colors.foreground }]
                                    ]}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Options */}
                    <View style={styles.optionContainer}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.optionTitle, { color: colors.foreground }]}>Allow Background</Text>
                            <Text variant="muted" style={styles.optionDescription}>
                                Timer continues when you switch apps (e.g. for Online Class).
                            </Text>
                        </View>
                        <Switch
                            value={allowBackground}
                            onValueChange={setAllowBackground}
                            trackColor={{ false: colors.muted, true: selectedColor }}
                            thumbColor={'#fff'}
                        />
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
                            disabled={!topicName.trim()}
                            style={[
                                styles.button,
                                styles.saveButton,
                                { backgroundColor: selectedColor, opacity: topicName.trim() ? 1 : 0.5 },
                            ]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>
                                Create Topic
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
        padding: 24,
    },
    modal: {
        borderRadius: 24,
        padding: 24,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
    },
    closeButton: {
        padding: 4,
        marginTop: -4,
        marginRight: -4,
    },
    inputContainer: {
        marginBottom: 24,
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 2,
    },
    colorContainer: {
        marginBottom: 24,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    colorButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    selectedColor: {
        borderWidth: 3,
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    optionDescription: {
        fontSize: 12,
        marginTop: 4,
        paddingRight: 16,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
    },
    saveButton: {
    },
});
