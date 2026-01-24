import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { X } from 'lucide-react-native';
import * as React from 'react';
import * as Haptics from 'expo-haptics';
import {
    Modal,
    Pressable,
    TextInput,
    View,
    StyleSheet,
    Switch,
} from 'react-native';

interface AddTopicModalProps {
    visible: boolean;
    folderName: string;
    folderColor: string;
    onClose: () => void;
    folderColor: string;
    onClose: () => void;
    onSave: (topicName: string, allowBackground: boolean) => void;
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

    React.useEffect(() => {
        if (visible) {
            setTopicName('');
            setAllowBackground(false);
        }
    }, [visible]);

    const handleSave = () => {
        if (!topicName.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(topicName.trim(), allowBackground);
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
                                    borderColor: folderColor,
                                },
                            ]}
                        />
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
                            trackColor={{ false: colors.muted, true: folderColor }}
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
                                { backgroundColor: folderColor, opacity: topicName.trim() ? 1 : 0.5 },
                            ]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>
                                Start Timer
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
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    inputContainer: {
        marginBottom: 20,
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 16,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    optionDescription: {
        fontSize: 13,
        lineHeight: 18,
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
