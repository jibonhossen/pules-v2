import { CustomTabBar } from '@/components/CustomTabBar';
import { Tabs } from 'expo-router';

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Folders',
                }}
            />
            <Tabs.Screen
                name="timer"
                options={{
                    title: 'Timer',
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Reports',
                }}
            />
        </Tabs>
    );
}
