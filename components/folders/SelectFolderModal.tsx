import { Text } from '@/components/ui/Text';
import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Folder as FolderIcon, X, Check } from 'lucide-react-native';
import * as React from 'react';
import * as Haptics from 'expo-haptics';
import {
    Modal,
    Pressable,
    View,
    StyleSheet,
    ScrollView,
} from 'react-native';
import type { Folder } from '@/lib/database';

interface SelectFolderModalProps {
    visible: boolean;
    folders: Folder[];
    topic: string;
    onClose: () => void;
    onSelect: (folderId: number) => void;
}

export function SelectFolderModal({
    visible,
    folders,
    topic,
    onClose,
    onSelect,
}: SelectFolderModalProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];

    const handleSelect = (folderId: number) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSelect(folderId);
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
                                Move Topic
                            </Text>
                            <Text variant="muted" style={styles.subtitle}>
                                "{topic}"
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={22} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    {/* Folders List */}
                    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                        {folders.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text variant="muted">No folders created yet.</Text>
                            </View>
                        ) : (
                            folders.map((folder) => (
                                <Pressable
                                    key={folder.id}
                                    onPress={() => handleSelect(folder.id)}
                                    style={({ pressed }) => [
                                        styles.folderItem,
                                        { backgroundColor: pressed ? colors.muted : 'transparent' }
                                    ]}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: `${folder.color}20` }]}>
                                        <FolderIcon size={20} color={folder.color} fill={folder.color} />
                                    </View>
                                    <Text style={[styles.folderName, { color: colors.foreground }]}>
                                        {folder.name}
                                    </Text>
                                    <Check size={16} color="transparent" />
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
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
        maxHeight: '70%',
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
    list: {
        maxHeight: 400,
    },
    listContent: {
        gap: 8,
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    folderName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
});
