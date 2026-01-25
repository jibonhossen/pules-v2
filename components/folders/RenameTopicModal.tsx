import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { X, Edit3 } from 'lucide-react-native';
import * as React from 'react';
import * as Haptics from 'expo-haptics';
import {
    Modal,
    Pressable,
    TextInput,
    View,
    StyleSheet,
} from 'react-native';

interface RenameTopicModalProps {
    visible: boolean;
    currentTopic: string;
    onClose: () => void;
    onSave: (oldTopic: string, newTopic: string) => void;
}

export function RenameTopicModal({
    visible,
    currentTopic,
    onClose,
    onSave,
}: RenameTopicModalProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const [newTopicName, setNewTopicName] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setNewTopicName(currentTopic);
        }
    }, [visible, currentTopic]);

    const handleSave = () => {
        if (!newTopicName.trim() || newTopicName.trim() === currentTopic) {
            onClose();
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(currentTopic, newTopicName.trim());
        onClose();
    };

    const isChanged = newTopicName.trim() && newTopicName.trim() !== currentTopic;

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
                        <View style={styles.headerLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                                <Edit3 size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.title, { color: colors.foreground }]}>
                                Rename Topic
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={22} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    {/* Topic input */}
                    <View style={styles.inputContainer}>
                        <Text variant="muted" style={styles.label}>Topic Name</Text>
                        <TextInput
                            value={newTopicName}
                            onChangeText={setNewTopicName}
                            placeholder="Enter new topic name"
                            placeholderTextColor={colors.mutedForeground}
                            autoFocus
                            selectTextOnFocus
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.muted,
                                    color: colors.foreground,
                                    borderColor: colors.primary,
                                },
                            ]}
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
                            disabled={!isChanged}
                            style={[
                                styles.button,
                                styles.saveButton,
                                { backgroundColor: colors.primary, opacity: isChanged ? 1 : 0.5 },
                            ]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>
                                Save
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
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
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 2,
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
