import { PULSE_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSyncStore } from '@/store/sync';
import { useUser } from '@clerk/clerk-expo';
import { AlertCircle, Check, Cloud, CloudOff, RefreshCw } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface SyncStatusCardProps {
    compact?: boolean;
}

export function SyncStatusCard({ compact = false }: SyncStatusCardProps) {
    const { colorScheme } = useColorScheme();
    const colors = PULSE_COLORS[colorScheme ?? 'dark'];
    const isDark = colorScheme === 'dark';

    const { user } = useUser();
    const userId = user?.id;

    const {
        status,
        lastSyncTime,
        pendingChanges,
        error,
        autoSyncEnabled,
        sync,
        clearError,
    } = useSyncStore();

    const handleSync = async () => {
        if (!userId) return;
        clearError();
        await sync(userId);
    };

    const formatLastSync = (date: Date | null): string => {
        if (!date) return 'Never synced';

        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    const getStatusIcon = () => {
        if (!userId) {
            return <CloudOff size={20} color={colors.mutedForeground} />;
        }

        switch (status) {
            case 'syncing':
                return <ActivityIndicator size="small" color={colors.primary} />;
            case 'success':
                return <Check size={20} color="#22c55e" />;
            case 'error':
                return <AlertCircle size={20} color={colors.destructive} />;
            default:
                return <Cloud size={20} color={colors.primary} />;
        }
    };

    const getStatusText = (): string => {
        if (!userId) return 'Sign in to enable sync';

        switch (status) {
            case 'syncing':
                return 'Syncing...';
            case 'success':
                return formatLastSync(lastSyncTime);
            case 'error':
                return error || 'Sync failed';
            default:
                return pendingChanges > 0
                    ? `${pendingChanges} pending changes`
                    : formatLastSync(lastSyncTime);
        }
    };

    const styles = createStyles(colors, isDark);

    if (compact) {
        return (
            <Pressable
                style={styles.compactContainer}
                onPress={handleSync}
                disabled={status === 'syncing' || !userId}
            >
                {getStatusIcon()}
                <Text style={styles.compactText}>{getStatusText()}</Text>
            </Pressable>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Cloud size={24} color={colors.primary} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Cloud Sync</Text>
                    <Text style={styles.subtitle}>
                        {userId ? 'Keep your data synced across devices' : 'Sign in to enable'}
                    </Text>
                </View>
            </View>

            <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                    {getStatusIcon()}
                    <Text style={[
                        styles.statusText,
                        status === 'error' && { color: colors.destructive }
                    ]}>
                        {getStatusText()}
                    </Text>
                </View>

                <Pressable
                    style={({ pressed }) => [
                        styles.syncButton,
                        pressed && styles.syncButtonPressed,
                        (!userId || status === 'syncing') && styles.syncButtonDisabled,
                    ]}
                    onPress={handleSync}
                    disabled={status === 'syncing' || !userId}
                >
                    <RefreshCw
                        size={18}
                        color={!userId || status === 'syncing' ? colors.mutedForeground : colors.primary}
                        style={status === 'syncing' ? { opacity: 0.5 } : undefined}
                    />
                    <Text style={[
                        styles.syncButtonText,
                        (!userId || status === 'syncing') && { color: colors.mutedForeground }
                    ]}>
                        Sync Now
                    </Text>
                </Pressable>
            </View>

            {autoSyncEnabled && userId && (
                <Text style={styles.autoSyncHint}>
                    Auto-sync enabled • Data syncs after each session
                </Text>
            )}
        </View>
    );
}

const createStyles = (colors: typeof PULSE_COLORS.dark, isDark: boolean) =>
    StyleSheet.create({
        container: {
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            gap: 12,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        iconContainer: {
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: `${colors.primary}15`,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerText: {
            flex: 1,
        },
        title: {
            fontSize: 16,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.foreground,
        },
        subtitle: {
            fontSize: 13,
            fontFamily: 'Poppins_400Regular',
            color: colors.mutedForeground,
        },
        statusRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        statusInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        statusText: {
            fontSize: 14,
            fontFamily: 'Poppins_500Medium',
            color: colors.foreground,
        },
        syncButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: `${colors.primary}15`,
        },
        syncButtonPressed: {
            opacity: 0.7,
        },
        syncButtonDisabled: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        },
        syncButtonText: {
            fontSize: 14,
            fontFamily: 'Poppins_600SemiBold',
            color: colors.primary,
        },
        autoSyncHint: {
            fontSize: 12,
            fontFamily: 'Poppins_400Regular',
            color: colors.mutedForeground,
            textAlign: 'center',
        },
        compactContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            padding: 8,
        },
        compactText: {
            fontSize: 12,
            fontFamily: 'Poppins_500Medium',
            color: colors.mutedForeground,
        },
    });
