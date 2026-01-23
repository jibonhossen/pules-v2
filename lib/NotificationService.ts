import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const TIMER_NOTIFICATION_ID = 'timer-notification';
const TIMER_TASK_NAME = 'TIMER_BACKGROUND_TASK';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export class NotificationService {
    private static instance: NotificationService;
    private hasPermission: boolean = false;
    private currentTopic: string = '';

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Request notification permissions
     */
    async requestPermissions(): Promise<boolean> {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        this.hasPermission = finalStatus === 'granted';

        // Setup Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('timer', {
                name: 'Timer',
                importance: Notifications.AndroidImportance.HIGH,
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                bypassDnd: false,
                description: 'Timer notifications',
                enableVibrate: false,
                showBadge: false,
            });
        }

        return this.hasPermission;
    }

    /**
     * Show timer notification with elapsed time
     */
    async showTimerNotification(topic: string, elapsedSeconds: number): Promise<void> {
        if (!this.hasPermission) {
            await this.requestPermissions();
        }

        this.currentTopic = topic;

        await Notifications.scheduleNotificationAsync({
            identifier: TIMER_NOTIFICATION_ID,
            content: {
                title: '⏱️ Timer Running',
                body: `${topic} • ${formatTime(elapsedSeconds)}`,
                data: { type: 'timer' },
                sticky: true,
                autoDismiss: false,
                ...(Platform.OS === 'android' && {
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                }),
            },
            trigger: null, // Show immediately
        });
    }

    /**
     * Update the timer notification with new elapsed time
     */
    async updateTimerNotification(elapsedSeconds: number): Promise<void> {
        if (!this.hasPermission || !this.currentTopic) return;

        // Cancel existing and show new (this updates the notification)
        await Notifications.scheduleNotificationAsync({
            identifier: TIMER_NOTIFICATION_ID,
            content: {
                title: '⏱️ Timer Running',
                body: `${this.currentTopic} • ${formatTime(elapsedSeconds)}`,
                data: { type: 'timer' },
                sticky: true,
                autoDismiss: false,
                ...(Platform.OS === 'android' && {
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                }),
            },
            trigger: null,
        });
    }

    /**
     * Hide the timer notification
     */
    async hideTimerNotification(): Promise<void> {
        this.currentTopic = '';
        await Notifications.dismissNotificationAsync(TIMER_NOTIFICATION_ID);
    }

    /**
     * Check if notifications are enabled
     */
    async checkPermissions(): Promise<boolean> {
        const { status } = await Notifications.getPermissionsAsync();
        this.hasPermission = status === 'granted';
        return this.hasPermission;
    }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
